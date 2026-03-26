import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HistoryBatcher } from './batching'
import type { RecordedMonacoEvent } from './types'

function createEvent(sequence: number): RecordedMonacoEvent {
  return {
    sequence,
    timestamp: sequence * 100,
    versionId: sequence,
    isUndoing: false,
    isRedoing: false,
    isFlush: false,
    isEolChange: false,
    eol: '\n',
    changes: [],
  }
}

describe('HistoryBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_700_000_000_000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('flushes queued events in periodic batches', async () => {
    const sendBatch = vi.fn().mockResolvedValue(undefined)
    const batcher = new HistoryBatcher({
      sessionId: 'session-1',
      language: 'python',
      intervalMs: 500,
      sendBatch,
    })

    batcher.enqueue(createEvent(1))
    batcher.enqueue(createEvent(2))

    await vi.advanceTimersByTimeAsync(500)

    expect(sendBatch).toHaveBeenCalledTimes(1)
    expect(sendBatch).toHaveBeenCalledWith({
      sessionId: 'session-1',
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [createEvent(1), createEvent(2)],
    })
  })

  it('restores pending events when a flush fails', async () => {
    const sendBatch = vi.fn().mockRejectedValue(new Error('network down'))
    const states: string[] = []
    const batcher = new HistoryBatcher({
      sessionId: 'session-2',
      language: 'python',
      intervalMs: 500,
      sendBatch,
      onStateChange: (state) => {
        states.push(`${state.pendingEvents}:${state.isFlushing}:${state.lastError ?? 'ok'}`)
      },
    })

    batcher.enqueue(createEvent(1))
    await expect(batcher.flush()).rejects.toThrow('network down')

    expect(sendBatch).toHaveBeenCalledTimes(1)
    expect(sendBatch).toHaveBeenCalledWith({
      sessionId: 'session-2',
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [createEvent(1)],
    })
    expect(states.at(-1)).toBe('1:false:network down')
  })

  it('does nothing when flush runs with no pending events', async () => {
    const sendBatch = vi.fn().mockResolvedValue(undefined)
    const batcher = new HistoryBatcher({
      sessionId: 'session-3',
      language: 'python',
      intervalMs: 500,
      sendBatch,
    })

    await batcher.flush()

    expect(sendBatch).not.toHaveBeenCalled()
  })

  it('advances batch sequence after each successful flush', async () => {
    const sendBatch = vi.fn().mockResolvedValue(undefined)
    const batcher = new HistoryBatcher({
      sessionId: 'session-4',
      language: 'python',
      intervalMs: 500,
      sendBatch,
    })

    batcher.enqueue(createEvent(1))
    await batcher.flush()
    batcher.enqueue(createEvent(2))
    await batcher.flush()

    expect(sendBatch).toHaveBeenNthCalledWith(1, {
      sessionId: 'session-4',
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [createEvent(1)],
    })
    expect(sendBatch).toHaveBeenNthCalledWith(2, {
      sessionId: 'session-4',
      language: 'python',
      batchSequence: 2,
      eventOffset: 1,
      events: [createEvent(2)],
    })
  })
})
