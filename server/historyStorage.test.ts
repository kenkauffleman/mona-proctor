import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { HistoryStorage } from './historyStorage'
import { createRecordedMonacoEvent } from '../src/features/history/history'
import type { MonacoContentChangeEvent } from '../src/features/history/types'

function createTempDatabasePath() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mona-proctor-storage-'))
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

afterEach(() => {
  while (storages.length > 0) {
    storages.pop()?.close()
  }
})

describe('HistoryStorage', () => {
  it('stores and retrieves ordered history for a session', () => {
    const storage = new HistoryStorage(createTempDatabasePath())
    storages.push(storage)
    const sessionId = 'session-1'
    const insertA = createRecordedMonacoEvent(
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
            text: 'a',
          },
        ],
      }),
      1,
      100,
    )
    const insertB = createRecordedMonacoEvent(
      createContentChangeEvent({
        changes: [
          {
            range: {
              startLineNumber: 1,
              startColumn: 2,
              endLineNumber: 1,
              endColumn: 2,
            },
            rangeOffset: 1,
            rangeLength: 0,
            text: 'b',
          },
        ],
      }),
      2,
      200,
    )

    const totalAfterFirstAppend = storage.appendSessionEvents(sessionId, 'python', [insertB])
    const totalAfterSecondAppend = storage.appendSessionEvents(sessionId, 'python', [insertA, insertB])
    const session = storage.getSession(sessionId)

    expect(totalAfterFirstAppend).toBe(1)
    expect(totalAfterSecondAppend).toBe(2)
    expect(session).toEqual({
      sessionId,
      language: 'python',
      events: [insertA, insertB],
    })
  })
})
