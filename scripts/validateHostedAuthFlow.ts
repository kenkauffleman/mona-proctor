import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { replayRecordedMonacoEvents } from '../src/features/history/history.js'
import type { AppendHistoryBatchRequest, HistorySessionResponse } from '../src/features/history/apiTypes.js'
import { parseAuthSeedUsers } from './authSeedUsers.js'

type TerraformOutputs = {
  firebase_web_app: {
    value: {
      api_key: string
      project_id: string
    }
  }
  frontend_hosting_origins: {
    value: string[]
  }
  service_uri: {
    value: string
  }
}

type ValidationUser = {
  email: string
  password: string
}

function readTerraformOutputs() {
  const raw = execFileSync('terraform', ['-chdir=infra/terraform/hosted', 'output', '-json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  return JSON.parse(raw) as TerraformOutputs
}

async function signInWithPassword(apiKey: string, user: ValidationUser) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      returnSecureToken: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Hosted sign-in failed for ${user.email}: ${await response.text()}`)
  }

  const body = await response.json() as { idToken: string }
  return body.idToken
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

async function appendBatch(baseUrl: string, origin: string, idToken: string, sessionId: string, batch: AppendHistoryBatchRequest) {
  const response = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
      origin,
    },
    body: JSON.stringify(batch),
  })

  if (!response.ok) {
    throw new Error(`Append failed with ${response.status}: ${await response.text()}`)
  }

  const corsOrigin = response.headers.get('access-control-allow-origin')
  if (corsOrigin !== origin) {
    throw new Error(`Expected CORS allow origin ${origin} but received ${String(corsOrigin)}`)
  }
}

async function main() {
  const outputs = readTerraformOutputs()
  const frontendOrigin = outputs.frontend_hosting_origins.value[0]
  const backendBaseUrl = outputs.service_uri.value
  const apiKey = outputs.firebase_web_app.value.api_key
  const [ownerUser, otherUser] = parseAuthSeedUsers(process.env.AUTH_SEED_USERS_JSON, { required: true })

  if (!ownerUser || !otherUser) {
    throw new Error('AUTH_SEED_USERS_JSON must contain at least two users for Wave 11 validation.')
  }

  const sessionId = `wave-11-${Date.now()}`

  console.log(`Validating hosted frontend availability at ${frontendOrigin}`)
  const frontendResponse = await fetch(frontendOrigin)
  if (!frontendResponse.ok) {
    throw new Error(`Hosted frontend returned ${frontendResponse.status}`)
  }

  const ownerToken = await signInWithPassword(apiKey, ownerUser)
  const otherToken = await signInWithPassword(apiKey, otherUser)

  await appendBatch(backendBaseUrl, frontendOrigin, ownerToken, sessionId, createBatch('hello', 1, 0, 0))
  await appendBatch(backendBaseUrl, frontendOrigin, ownerToken, sessionId, createBatch(' hosted', 2, 1, 5))

  const ownerLoadResponse = await fetch(`${backendBaseUrl}/api/history/sessions/${sessionId}`, {
    headers: {
      authorization: `Bearer ${ownerToken}`,
      origin: frontendOrigin,
    },
  })

  if (!ownerLoadResponse.ok) {
    throw new Error(`Owner load failed with ${ownerLoadResponse.status}: ${await ownerLoadResponse.text()}`)
  }

  const ownerSession = await ownerLoadResponse.json() as HistorySessionResponse
  const replayedSource = replayRecordedMonacoEvents('', ownerSession.events)

  if (replayedSource !== 'hello hosted') {
    throw new Error(`Expected replayed source "hello hosted" but received ${JSON.stringify(replayedSource)}`)
  }

  const deniedResponse = await fetch(`${backendBaseUrl}/api/history/sessions/${sessionId}`, {
    headers: {
      authorization: `Bearer ${otherToken}`,
      origin: frontendOrigin,
    },
  })

  if (deniedResponse.status !== 403) {
    throw new Error(`Expected cross-user denial with 403 but received ${deniedResponse.status}`)
  }

  const deniedBody = await deniedResponse.json() as { error?: string }
  if (!deniedBody.error?.includes('does not own')) {
    throw new Error(`Unexpected denial body: ${JSON.stringify(deniedBody)}`)
  }

  const unauthorizedResponse = await fetch(`${backendBaseUrl}/api/history/sessions/${sessionId}`, {
    headers: {
      origin: frontendOrigin,
    },
  })

  if (unauthorizedResponse.status !== 401) {
    throw new Error(`Expected unauthenticated request to return 401 but received ${unauthorizedResponse.status}`)
  }

  console.log(`Hosted auth flow validation succeeded for ${sessionId}.`)
  console.log(`Frontend origin ${frontendOrigin} signed in, called ${backendBaseUrl}, and replayed "${replayedSource}".`)
}

main().catch((error: unknown) => {
  console.error('Hosted auth flow validation failed.')
  console.error(error)
  process.exit(1)
})
