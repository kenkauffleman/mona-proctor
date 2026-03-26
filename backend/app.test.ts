import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createRecordedMonacoEvent, replayRecordedMonacoEvents } from '../src/features/history/history.js'
import type { RecordedMonacoEvent } from '../src/features/history/types.js'
import type { MonacoContentChangeEvent } from '../src/features/history/types.js'
import { createBackendApp } from './app.js'
import { InMemoryHistoryRepository } from './inMemoryHistoryRepository.js'

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
  const app = createBackendApp(repository, {
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

describe('backend history app', () => {
  it('reports health metadata for the backend runtime', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      projectId: 'demo-mona-proctor',
      firestoreEmulatorHost: '127.0.0.1:8080',
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
      headers: {
        'content-type': 'application/json',
      },
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
    })

    const appendSecondResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
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
    })

    const sessionResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`)

    expect(sessionResponse.status).toBe(200)

    const session = await sessionResponse.json() as {
      sessionId: string
      language: string
      batches: Array<{ batchSequence: number; eventOffset: number; eventCount: number; uploadedAt: string }>
      events: RecordedMonacoEvent[]
    }

    expect(session.sessionId).toBe(sessionId)
    expect(session.language).toBe('python')
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
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const retryResponse = await fetch(`${baseUrl}/api/history/sessions/retry-session/batches`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
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
    })
  })

  it('rejects batches whose sequences do not match the declared offset', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/api/history/sessions/bad-order/batches`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
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
      headers: {
        'content-type': 'application/json',
      },
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
      headers: {
        'content-type': 'application/json',
      },
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
})
