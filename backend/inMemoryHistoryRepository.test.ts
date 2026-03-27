import { describe, expect, it } from 'vitest'
import type { AppendHistoryBatchInput } from './historyRepository.js'
import { InMemoryHistoryRepository } from './inMemoryHistoryRepository.js'

function createBatch(overrides: Partial<AppendHistoryBatchInput> = {}): AppendHistoryBatchInput {
  return {
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
    ...overrides,
  }
}

describe('InMemoryHistoryRepository', () => {
  it('stores batches separately and returns ordered replay history', async () => {
    const repository = new InMemoryHistoryRepository()
    const owner = { uid: 'user-1' }

    await repository.appendHistoryBatch('session-1', owner, createBatch())
    await repository.appendHistoryBatch('session-1', owner, createBatch({
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
    }))

    const session = await repository.loadSessionHistory('session-1', owner)

    expect(session).toMatchObject({
      sessionId: 'session-1',
      language: 'python',
      ownerUid: 'user-1',
      batches: [
        { batchSequence: 1, eventOffset: 0, eventCount: 1 },
        { batchSequence: 2, eventOffset: 1, eventCount: 1 },
      ],
    })
    expect(session?.events.map((event) => event.sequence)).toEqual([1, 2])
  })

  it('allows idempotent retries but rejects conflicting payload reuse', async () => {
    const repository = new InMemoryHistoryRepository()
    const batch = createBatch()
    const owner = { uid: 'user-1' }

    await repository.appendHistoryBatch('session-2', owner, batch)
    await repository.appendHistoryBatch('session-2', owner, batch)

    await expect(repository.appendHistoryBatch('session-2', owner, createBatch({
      events: [{
        sequence: 1,
        timestamp: 101,
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [],
      }],
    }))).rejects.toThrow('Batch sequence already exists with different history payload.')
  })

  it('rejects a different authenticated user for append and load', async () => {
    const repository = new InMemoryHistoryRepository()

    await repository.appendHistoryBatch('session-3', { uid: 'owner-1' }, createBatch())

    await expect(
      repository.appendHistoryBatch('session-3', { uid: 'owner-2' }, createBatch({
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
      })),
    ).rejects.toThrow('Authenticated user does not own this session.')

    await expect(
      repository.loadSessionHistory('session-3', { uid: 'owner-2' }),
    ).rejects.toThrow('Authenticated user does not own this session.')
  })
})
