import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createHistoryApi } from './historyApi'
import { HistoryStorage } from './historyStorage'
import { createRecordedMonacoEvent, replayRecordedMonacoEvents } from '../src/features/history/history'
import type { MonacoContentChangeEvent } from '../src/features/history/types'

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mona-proctor-api-'))
  return path.join(directory, 'history.db')
}

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

const storages: HistoryStorage[] = []
const servers: Array<{ close: () => void }> = []

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close()
  }

  while (storages.length > 0) {
    storages.pop()?.close()
  }
})

async function startTestServer() {
  const storage = new HistoryStorage(createTempDatabasePath())
  storages.push(storage)
  const app = createHistoryApi(storage)
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  servers.push(server)

  const { port } = server.address() as AddressInfo
  return {
    baseUrl: `http://127.0.0.1:${port}`,
  }
}

describe('history API', () => {
  it('accepts session batches, returns ordered history, and reconstructs the final source', async () => {
    const { baseUrl } = await startTestServer()
    const sessionId = 'session-abc'
    const events = [
      createRecordedMonacoEvent(
        createContentChangeEvent({
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
              },
              rangeOffset: 0,
              rangeLength: 0,
              text: 'hello',
            },
          ],
        }),
        1,
        100,
      ),
      createRecordedMonacoEvent(
        createContentChangeEvent({
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 6,
                endLineNumber: 1,
                endColumn: 6,
              },
              rangeOffset: 5,
              rangeLength: 0,
              text: ' world',
            },
          ],
        }),
        2,
        200,
      ),
    ]

    const appendResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        events,
      }),
    })

    expect(appendResponse.status).toBe(200)
    expect(await appendResponse.json()).toEqual({
      sessionId,
      acceptedEvents: 2,
      totalEvents: 2,
    })

    const sessionResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`)

    expect(sessionResponse.status).toBe(200)

    const session = (await sessionResponse.json()) as {
      events: typeof events
      language: string
      sessionId: string
    }

    expect(session.sessionId).toBe(sessionId)
    expect(session.language).toBe('python')
    expect(session.events).toEqual(events)
    expect(replayRecordedMonacoEvents('', session.events)).toBe('hello world')
  })

  it('rejects out-of-order event batches', async () => {
    const { baseUrl } = await startTestServer()

    const response = await fetch(`${baseUrl}/api/history/sessions/bad-order/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        events: [
          { sequence: 2, timestamp: 20, changes: [] },
          { sequence: 1, timestamp: 10, changes: [] },
        ],
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toContain('ordered by increasing sequence')
  })
})
