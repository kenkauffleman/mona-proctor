import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { replayRecordedMonacoEvents } from '../src/features/history/history.js'
import type { AppendHistoryBatchRequest, HistorySessionResponse } from '../src/features/history/apiTypes.js'

type DeployConfig = {
  projectId: string
  region: string
  serviceName: string
}

function parseArgs(argv: string[]): DeployConfig {
  const config: Partial<DeployConfig> = {
    projectId: process.env.CLOUDRUN_PROJECT_ID,
    region: process.env.CLOUDRUN_REGION,
    serviceName: process.env.CLOUDRUN_SERVICE_NAME ?? 'mona-proctor-backend',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]

    switch (argument) {
      case '--project':
        config.projectId = value
        index += 1
        break
      case '--region':
        config.region = value
        index += 1
        break
      case '--service':
        config.serviceName = value
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (!config.projectId || !config.region || !config.serviceName) {
    throw new Error('Cloud Run private validation requires project, region, and service inputs.')
  }

  return config as DeployConfig
}

function runGcloud(args: string[]) {
  return execFileSync('gcloud', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim()
}

function createBatch(text: string, batchSequence: number, eventOffset: number, rangeOffset: number): AppendHistoryBatchRequest {
  return {
    language: 'python',
    batchSequence,
    eventOffset,
    events: [{
      sequence: eventOffset + 1,
      timestamp: 100 * batchSequence,
      versionId: batchSequence,
      isUndoing: false,
      isRedoing: false,
      isFlush: false,
      isEolChange: false,
      eol: '\n',
      changes: [{
        range: {
          startLineNumber: 1,
          startColumn: rangeOffset + 1,
          endLineNumber: 1,
          endColumn: rangeOffset + 1,
        },
        rangeOffset,
        rangeLength: 0,
        text,
      }],
    }],
  }
}

async function appendBatch(serviceUrl: string, identityToken: string, sessionId: string, batch: AppendHistoryBatchRequest) {
  const response = await fetch(`${serviceUrl}/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${identityToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(batch),
  })

  if (!response.ok) {
    throw new Error(`Append batch failed with ${response.status}: ${await response.text()}`)
  }
}

async function main() {
  const config = parseArgs(process.argv.slice(2))
  const serviceUrl = runGcloud([
    'run',
    'services',
    'describe',
    config.serviceName,
    `--project=${config.projectId}`,
    `--region=${config.region}`,
    '--format=value(status.url)',
  ])
  const identityToken = runGcloud(['auth', 'print-identity-token'])
  const sessionId = `wave-9-${Date.now()}`
  const firstBatch = createBatch('hello', 1, 0, 0)
  const secondBatch = createBatch(' cloud', 2, 1, 5)

  console.log(`Validating private Cloud Run history flow against ${serviceUrl}`)
  console.log(`Using session ${sessionId}`)

  await appendBatch(serviceUrl, identityToken, sessionId, firstBatch)
  await appendBatch(serviceUrl, identityToken, sessionId, secondBatch)

  const loadResponse = await fetch(`${serviceUrl}/api/history/sessions/${sessionId}`, {
    headers: {
      authorization: `Bearer ${identityToken}`,
    },
  })

  if (!loadResponse.ok) {
    throw new Error(`Load session failed with ${loadResponse.status}: ${await loadResponse.text()}`)
  }

  const session = await loadResponse.json() as HistorySessionResponse
  const finalSource = replayRecordedMonacoEvents('', session.events)

  if (session.sessionId !== sessionId) {
    throw new Error(`Loaded unexpected session: ${session.sessionId}`)
  }

  if (session.batches.length !== 2) {
    throw new Error(`Expected 2 stored batches but received ${session.batches.length}`)
  }

  if (finalSource !== 'hello cloud') {
    throw new Error(`Expected replay source to be "hello cloud" but received ${JSON.stringify(finalSource)}`)
  }

  console.log(`Private Cloud Run validation succeeded for ${sessionId}.`)
  console.log(`Stored ${session.events.length} event(s) across ${session.batches.length} batch(es) and reconstructed "${finalSource}".`)
}

main().catch((error: unknown) => {
  console.error('Private Cloud Run validation failed.')
  console.error(error)
  process.exit(1)
})
