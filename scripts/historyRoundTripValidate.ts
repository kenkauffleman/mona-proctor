import { spawn } from 'node:child_process'
import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { replayRecordedMonacoEvents } from '../src/features/history/history.js'

const port = 18081
const host = '127.0.0.1'
const baseUrl = `http://${host}:${port}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHealthcheck(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (response.ok) {
        return
      }
    } catch {
      // Retry until the backend starts listening.
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for backend at ${baseUrl}`)
}

async function main() {
  const backendProcess = spawn(
    'npx',
    ['tsx', '--no-cache', 'backend/index.ts'],
    {
      env: {
        ...process.env,
        PORT: String(port),
        GCLOUD_PROJECT: projectId,
      },
      stdio: 'inherit',
    },
  )

  try {
    await waitForHealthcheck(30_000)

    const sessionId = `wave-7-${Date.now()}`
    const firstBatch = {
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [{
        sequence: 1,
        timestamp: 100,
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
          rangeOffset: 0,
          rangeLength: 0,
          text: 'hello',
        }],
      }],
    }
    const secondBatch = {
      language: 'python',
      batchSequence: 2,
      eventOffset: 1,
      events: [{
        sequence: 2,
        timestamp: 200,
        versionId: 2,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 6,
            endLineNumber: 1,
            endColumn: 6,
          },
          rangeOffset: 5,
          rangeLength: 0,
          text: ' world',
        }],
      }],
    }

    for (const batch of [firstBatch, secondBatch]) {
      const response = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      if (!response.ok) {
        throw new Error(`History batch append failed with ${response.status}: ${await response.text()}`)
      }
    }

    const sessionResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`)

    if (!sessionResponse.ok) {
      throw new Error(`History session load failed with ${sessionResponse.status}: ${await sessionResponse.text()}`)
    }

    const session = await sessionResponse.json() as {
      sessionId: string
      language: string
      batches: Array<{ batchSequence: number; eventCount: number; eventOffset: number }>
      events: typeof firstBatch.events
    }

    if (session.sessionId !== sessionId) {
      throw new Error(`Loaded the wrong session: ${JSON.stringify(session)}`)
    }

    if (session.language !== 'python') {
      throw new Error(`Expected python session language but received ${session.language}`)
    }

    if (session.batches.length !== 2) {
      throw new Error(`Expected 2 uploaded batches but received ${session.batches.length}`)
    }

    const finalSource = replayRecordedMonacoEvents('', session.events)

    if (finalSource !== 'hello world') {
      throw new Error(`Replay reconstruction was not deterministic: ${JSON.stringify({ finalSource, session })}`)
    }

    const firestore = new Firestore({ projectId })
    const sessionSnapshot = await firestore.collection('historySessions').doc(sessionId).get()

    if (!sessionSnapshot.exists) {
      throw new Error('Session metadata document was not found in Firestore.')
    }

    const sessionData = sessionSnapshot.data() as Record<string, unknown> | undefined

    if (!sessionData || 'events' in sessionData) {
      throw new Error(`Session metadata should stay separate from batch event payloads: ${JSON.stringify(sessionData)}`)
    }

    const batchSnapshots = await firestore
      .collection('historySessions')
      .doc(sessionId)
      .collection('batches')
      .orderBy('batchSequence', 'asc')
      .get()

    if (batchSnapshots.size !== 2) {
      throw new Error(`Expected 2 stored Firestore batch documents but received ${batchSnapshots.size}`)
    }

    console.log(
      `Wave 7 round trip validation succeeded for ${sessionId}. Loaded ${session.events.length} events across ${session.batches.length} batches and reconstructed "${finalSource}".`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Wave 7 round trip validation failed.')
  console.error(error)
  process.exit(1)
})
