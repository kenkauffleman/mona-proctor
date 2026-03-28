import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createRecordedMonacoEvent, replayRecordedMonacoEvents } from '../src/features/history/history.js'
import type { RecordedMonacoEvent } from '../src/features/history/types.js'
import type { MonacoContentChangeEvent } from '../src/features/history/types.js'
import type { AuthVerifier } from './auth.js'
import { createBackendApp } from './app.js'
import type { ExecutionBackend } from './executionBackend.js'
import { ExecutionService } from './executionService.js'
import { InMemoryHistoryRepository } from './inMemoryHistoryRepository.js'
import { InMemoryExecutionRepository } from './inMemoryExecutionRepository.js'

const servers: Array<{ close: () => void }> = []

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close()
  }
})

function createContentChangeEvent(
  overrides: Partial<MonacoContentChangeEvent> = {},
): MonacoContentChangeEvent {
  return {
    changes: [],
    eol: '\n',
    versionId: 1,
    isUndoing: false,
    isRedoing: false,
    isFlush: false,
    isEolChange: false,
    detailedReasonsChangeLengths: [],
    ...overrides,
  }
}

async function startTestServer() {
  const repository = new InMemoryHistoryRepository()
  const executionRepository = new InMemoryExecutionRepository()
  const authVerifier: AuthVerifier = {
    async verifyIdToken(idToken) {
      if (idToken === 'valid-owner-token') {
        return { uid: 'owner-1', email: 'owner@example.com' }
      }

      if (idToken === 'valid-other-token') {
        return { uid: 'owner-2', email: 'other@example.com' }
      }

      throw new Error('Invalid token')
    },
  }
  const executionBackend: ExecutionBackend = {
    name: 'test-execution-backend',
    async dispatch(job) {
      return {
        backendJobName: `dispatched-${job.jobId}`,
      }
    },
  }
  const executionService = new ExecutionService(
    executionRepository,
    executionBackend,
    {
      maxSourceBytes: 4096,
      timeoutMs: 5_000,
      maxStdoutBytes: 1024,
      maxStderrBytes: 1024,
      globalActiveJobLimit: 2,
    },
  )
  const app = createBackendApp(repository, authVerifier, executionService, {
    allowedOrigins: ['https://test.web.app'],
    cloudRunConfiguration: undefined,
    cloudRunRevision: undefined,
    cloudRunService: undefined,
    executionBackend: executionBackend.name,
    executionCloudRunJobName: 'mona-proctor-python-executor',
    executionCloudRunProjectId: 'demo-mona-proctor',
    executionCloudRunRegion: 'us-central1',
    executionGlobalActiveJobLimit: 2,
    executionMaxSourceBytes: 4096,
    executionMaxStderrBytes: 1024,
    executionMaxStdoutBytes: 1024,
    executionTimeoutMs: 5000,
    firebaseAuthEmulatorHost: '127.0.0.1:9099',
    projectId: 'demo-mona-proctor',
    firestoreEmulatorHost: '127.0.0.1:8080',
  })

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  servers.push(server)

  return {
    baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  }
}

function createAuthHeaders(token = 'valid-owner-token') {
  return {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  }
}

describe('backend history app', () => {
  it('reports health metadata for the backend runtime', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      allowedOrigins: ['https://test.web.app'],
      ok: true,
      cloudRunConfiguration: null,
      cloudRunRevision: null,
      cloudRunService: null,
      executionBackend: 'test-execution-backend',
      executionCloudRunJobName: 'mona-proctor-python-executor',
      executionCloudRunProjectId: 'demo-mona-proctor',
      executionCloudRunRegion: 'us-central1',
      executionGlobalActiveJobLimit: 2,
      executionMaxSourceBytes: 4096,
      executionMaxStderrBytes: 1024,
      executionMaxStdoutBytes: 1024,
      executionTimeoutMs: 5000,
      firebaseAuthEmulatorHost: '127.0.0.1:9099',
      projectId: 'demo-mona-proctor',
      firestoreEmulatorHost: '127.0.0.1:8080',
    })
  })

  it('returns CORS headers only for explicitly allowed origins', async () => {
    const { baseUrl } = await startTestServer()

    const allowedResponse = await fetch(`${baseUrl}/health`, {
      headers: {
        origin: 'https://test.web.app',
      },
    })

    const deniedResponse = await fetch(`${baseUrl}/health`, {
      headers: {
        origin: 'https://evil.example.com',
      },
    })

    expect(allowedResponse.headers.get('access-control-allow-origin')).toBe('https://test.web.app')
    expect(allowedResponse.headers.get('vary')).toBe('Origin')
    expect(deniedResponse.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('accepts preflight requests only for explicitly allowed origins', async () => {
    const { baseUrl } = await startTestServer()

    const allowedResponse = await fetch(`${baseUrl}/api/history/sessions/test-session`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://test.web.app',
      },
    })

    const deniedResponse = await fetch(`${baseUrl}/api/history/sessions/test-session`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example.com',
      },
    })

    expect(allowedResponse.status).toBe(204)
    expect(allowedResponse.headers.get('access-control-allow-origin')).toBe('https://test.web.app')
    expect(deniedResponse.status).toBe(403)
    expect(await deniedResponse.json()).toEqual({
      ok: false,
      error: 'Origin not allowed.',
    })
  })

  it('stores ordered history batches and loads a replayable session', async () => {
    const { baseUrl } = await startTestServer()
    const sessionId = 'wave-7-session'
    const insertHello = createRecordedMonacoEvent(
      createContentChangeEvent({
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
      }),
      1,
      100,
    )
    const insertWorld = createRecordedMonacoEvent(
      createContentChangeEvent({
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
      }),
      2,
      200,
    )

    const appendFirstResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [insertHello],
      }),
    })

    expect(appendFirstResponse.status).toBe(200)
    expect(await appendFirstResponse.json()).toEqual({
      sessionId,
      batchSequence: 1,
      acceptedEvents: 1,
      totalEvents: 1,
      totalBatches: 1,
      ownerUid: 'owner-1',
    })

    const appendSecondResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        batchSequence: 2,
        eventOffset: 1,
        events: [insertWorld],
      }),
    })

    expect(appendSecondResponse.status).toBe(200)
    expect(await appendSecondResponse.json()).toEqual({
      sessionId,
      batchSequence: 2,
      acceptedEvents: 1,
      totalEvents: 2,
      totalBatches: 2,
      ownerUid: 'owner-1',
    })

    const sessionResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`, {
      headers: createAuthHeaders(),
    })

    expect(sessionResponse.status).toBe(200)

    const session = await sessionResponse.json() as {
      sessionId: string
      language: string
      ownerUid: string
      batches: Array<{ batchSequence: number; eventOffset: number; eventCount: number; uploadedAt: string }>
      events: RecordedMonacoEvent[]
    }

    expect(session.sessionId).toBe(sessionId)
    expect(session.language).toBe('python')
    expect(session.ownerUid).toBe('owner-1')
    expect(session.batches).toHaveLength(2)
    expect(session.batches.map((batch) => ({
      batchSequence: batch.batchSequence,
      eventOffset: batch.eventOffset,
      eventCount: batch.eventCount,
    }))).toEqual([
      { batchSequence: 1, eventOffset: 0, eventCount: 1 },
      { batchSequence: 2, eventOffset: 1, eventCount: 1 },
    ])
    expect(session.events).toEqual([insertHello, insertWorld])
    expect(replayRecordedMonacoEvents('', session.events)).toBe('hello world')
  })

  it('accepts idempotent retries for an existing batch', async () => {
    const { baseUrl } = await startTestServer()
    const body = {
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
        changes: [],
      }],
    }

    const firstResponse = await fetch(`${baseUrl}/api/history/sessions/retry-session/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify(body),
    })
    const retryResponse = await fetch(`${baseUrl}/api/history/sessions/retry-session/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify(body),
    })

    expect(firstResponse.status).toBe(200)
    expect(retryResponse.status).toBe(200)
    expect(await retryResponse.json()).toEqual({
      sessionId: 'retry-session',
      batchSequence: 1,
      acceptedEvents: 1,
      totalEvents: 1,
      totalBatches: 1,
      ownerUid: 'owner-1',
    })
  })

  it('rejects missing or invalid bearer tokens', async () => {
    const { baseUrl } = await startTestServer()

    const missingTokenResponse = await fetch(`${baseUrl}/api/history/sessions/test/batches`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [],
      }),
    })

    expect(missingTokenResponse.status).toBe(401)
    expect(await missingTokenResponse.json()).toEqual({
      ok: false,
      error: 'Missing Bearer token.',
    })

    const invalidTokenResponse = await fetch(`${baseUrl}/api/history/sessions/test`, {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    expect(invalidTokenResponse.status).toBe(401)
    expect(await invalidTokenResponse.json()).toEqual({
      ok: false,
      error: 'Invalid Firebase ID token.',
    })
  })

  it('rejects batches whose sequences do not match the declared offset', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/api/history/sessions/bad-order/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [
          { sequence: 2, timestamp: 20, changes: [] },
        ],
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('contiguous and match the provided eventOffset')
  })

  it('returns a conflict when a retry reuses the batch sequence with different payload', async () => {
    const { baseUrl } = await startTestServer()

    await fetch(`${baseUrl}/api/history/sessions/conflict-session/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [{
          sequence: 1,
          timestamp: 10,
          versionId: 1,
          isUndoing: false,
          isRedoing: false,
          isFlush: false,
          isEolChange: false,
          eol: '\n',
          changes: [],
        }],
      }),
    })

    const response = await fetch(`${baseUrl}/api/history/sessions/conflict-session/batches`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [{
          sequence: 1,
          timestamp: 11,
          versionId: 1,
          isUndoing: false,
          isRedoing: false,
          isFlush: false,
          isEolChange: false,
          eol: '\n',
          changes: [],
        }],
      }),
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Batch sequence already exists with different history payload.',
    })
  })

  it('rejects access to a session owned by another authenticated user', async () => {
    const { baseUrl } = await startTestServer()
    const sessionId = 'owned-session'

    const createResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
      method: 'POST',
      headers: createAuthHeaders('valid-owner-token'),
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
          changes: [],
        }],
      }),
    })

    expect(createResponse.status).toBe(200)

    const appendAsOtherUser = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
      method: 'POST',
      headers: createAuthHeaders('valid-other-token'),
      body: JSON.stringify({
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
          changes: [],
        }],
      }),
    })

    expect(appendAsOtherUser.status).toBe(403)
    expect(await appendAsOtherUser.json()).toEqual({
      ok: false,
      error: 'Authenticated user does not own this session.',
    })

    const loadAsOtherUser = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`, {
      headers: createAuthHeaders('valid-other-token'),
    })

    expect(loadAsOtherUser.status).toBe(403)
    expect(await loadAsOtherUser.json()).toEqual({
      ok: false,
      error: 'Authenticated user does not own this session.',
    })
  })

  it('submits an execution job and allows the owner to fetch it', async () => {
    const { baseUrl } = await startTestServer()

    const createResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        source: 'print("hello from job")',
      }),
    })

    expect(createResponse.status).toBe(202)

    const createBody = await createResponse.json() as {
      job: {
        jobId: string
        ownerUid: string
        language: string
        source: string
        status: string
        backend: string
        backendJobName: string
        result: null
      }
    }

    expect(createBody.job.ownerUid).toBe('owner-1')
    expect(createBody.job.language).toBe('python')
    expect(createBody.job.status).toBe('queued')
    expect(createBody.job.backend).toBe('test-execution-backend')
    expect(createBody.job.backendJobName).toContain(`dispatched-${createBody.job.jobId}`)

    const loadResponse = await fetch(`${baseUrl}/api/execution/jobs/${createBody.job.jobId}`, {
      headers: createAuthHeaders(),
    })

    expect(loadResponse.status).toBe(200)
    expect(await loadResponse.json()).toMatchObject({
      job: {
        jobId: createBody.job.jobId,
        ownerUid: 'owner-1',
        language: 'python',
        source: 'print("hello from job")',
        status: 'queued',
      },
    })
  })

  it('returns the latest stored execution job for the authenticated user', async () => {
    const { baseUrl } = await startTestServer()

    const firstResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders('valid-owner-token'),
      body: JSON.stringify({
        language: 'python',
        source: 'print("first latest job")',
      }),
    })

    expect(firstResponse.status).toBe(202)

    const latestAfterFirst = await fetch(`${baseUrl}/api/execution/jobs/latest`, {
      headers: createAuthHeaders('valid-owner-token'),
    })

    expect(latestAfterFirst.status).toBe(200)
    expect(await latestAfterFirst.json()).toMatchObject({
      job: {
        ownerUid: 'owner-1',
        source: 'print("first latest job")',
      },
    })

    const latestForOtherUser = await fetch(`${baseUrl}/api/execution/jobs/latest`, {
      headers: createAuthHeaders('valid-other-token'),
    })

    expect(latestForOtherUser.status).toBe(200)
    expect(await latestForOtherUser.json()).toEqual({
      job: null,
    })
  })

  it('rejects a second active execution for the same authenticated user', async () => {
    const { baseUrl } = await startTestServer()

    const firstResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        source: 'print("first")',
      }),
    })

    expect(firstResponse.status).toBe(202)

    const secondResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'python',
        source: 'print("second")',
      }),
    })

    expect(secondResponse.status).toBe(409)
    expect(await secondResponse.json()).toEqual({
      ok: false,
      error: 'Authenticated user already has an active execution job.',
    })
  })

  it('rejects invalid execution requests and cross-user execution access', async () => {
    const { baseUrl } = await startTestServer()

    const invalidResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(),
      body: JSON.stringify({
        language: 'java',
        source: '',
      }),
    })

    expect(invalidResponse.status).toBe(400)
    expect(await invalidResponse.json()).toEqual({
      ok: false,
      error: 'Invalid execution job request.',
    })

    const createResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders('valid-owner-token'),
      body: JSON.stringify({
        language: 'python',
        source: 'print("owner")',
      }),
    })
    const createBody = await createResponse.json() as { job: { jobId: string } }

    const loadAsOtherUser = await fetch(`${baseUrl}/api/execution/jobs/${createBody.job.jobId}`, {
      headers: createAuthHeaders('valid-other-token'),
    })

    expect(loadAsOtherUser.status).toBe(403)
    expect(await loadAsOtherUser.json()).toEqual({
      ok: false,
      error: 'Authenticated user does not own this execution job.',
    })
  })

  it('returns 404 when an execution job does not exist', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/api/execution/jobs/does-not-exist`, {
      headers: createAuthHeaders(),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Execution job not found.',
    })
  })
})
