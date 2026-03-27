import { spawn } from 'node:child_process'
import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { ensureLocalAuthUser, localAuthUsers, signInLocalAuthUser } from './authEmulatorUsers.js'

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

async function appendHistory(sessionId: string, idToken: string) {
  const response = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
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
          text: 'print("hello")',
        }],
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Authenticated append failed with ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<{ ownerUid: string }>
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

    for (const user of localAuthUsers) {
      await ensureLocalAuthUser(user)
    }

    const firstUser = await signInLocalAuthUser(localAuthUsers[0]!)
    const secondUser = await signInLocalAuthUser(localAuthUsers[1]!)
    const sessionId = `wave-10-${Date.now()}`
    const appendResult = await appendHistory(sessionId, firstUser.idToken)

    if (appendResult.ownerUid !== firstUser.localId) {
      throw new Error(`Expected owner uid ${firstUser.localId} but received ${appendResult.ownerUid}`)
    }

    const loadResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`, {
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
      },
    })

    if (!loadResponse.ok) {
      throw new Error(`Authenticated load failed with ${loadResponse.status}: ${await loadResponse.text()}`)
    }

    const loadedSession = await loadResponse.json() as { ownerUid: string; events: Array<unknown> }

    if (loadedSession.ownerUid !== firstUser.localId || loadedSession.events.length !== 1) {
      throw new Error(`Unexpected loaded session payload: ${JSON.stringify(loadedSession)}`)
    }

    const forbiddenResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    if (forbiddenResponse.status !== 403) {
      throw new Error(`Expected second user access to fail with 403 but received ${forbiddenResponse.status}`)
    }

    const firestore = new Firestore({ projectId })
    const sessionSnapshot = await firestore.collection('historySessions').doc(sessionId).get()
    const sessionData = sessionSnapshot.data() as { ownerUid?: string } | undefined

    if (!sessionSnapshot.exists || sessionData?.ownerUid !== firstUser.localId) {
      throw new Error(`Expected Firestore owner uid ${firstUser.localId} but found ${JSON.stringify(sessionData)}`)
    }

    console.log(
      `Wave 10 local auth validation succeeded for ${sessionId}. Verified token auth, owner uid persistence, and cross-user access rejection.`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Wave 10 local auth validation failed.')
  console.error(error)
  process.exit(1)
})
