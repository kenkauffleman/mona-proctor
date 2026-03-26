import type {
  AppendHistoryBatchInput,
  AppendHistoryBatchResult,
  HistoryBatchRecord,
  HistoryRepository,
  HistorySessionRecord,
} from './historyRepository.js'

type StoredBatch = {
  batch: AppendHistoryBatchInput
  uploadedAt: string
}

type StoredSession = {
  language: AppendHistoryBatchInput['language']
  batches: Map<number, StoredBatch>
}

function cloneBatchRecord(batch: StoredBatch): HistoryBatchRecord {
  return {
    batchSequence: batch.batch.batchSequence,
    eventOffset: batch.batch.eventOffset,
    eventCount: batch.batch.events.length,
    uploadedAt: batch.uploadedAt,
  }
}

export class InMemoryHistoryRepository implements HistoryRepository {
  private readonly sessions = new Map<string, StoredSession>()

  async appendHistoryBatch(
    sessionId: string,
    batch: AppendHistoryBatchInput,
  ): Promise<AppendHistoryBatchResult> {
    const session = this.sessions.get(sessionId) ?? {
      language: batch.language,
      batches: new Map<number, StoredBatch>(),
    }

    if (session.language !== batch.language) {
      throw new Error('Session language cannot change after the first uploaded batch.')
    }

    const existingBatch = session.batches.get(batch.batchSequence)

    if (existingBatch) {
      const existingPayload = JSON.stringify(existingBatch.batch)
      const incomingPayload = JSON.stringify(batch)

      if (existingPayload !== incomingPayload) {
        throw new Error('Batch sequence already exists with different history payload.')
      }
    } else {
      session.batches.set(batch.batchSequence, {
        batch: structuredClone(batch),
        uploadedAt: new Date().toISOString(),
      })
    }

    this.sessions.set(sessionId, session)

    const orderedBatches = [...session.batches.values()].sort(
      (left, right) => left.batch.batchSequence - right.batch.batchSequence,
    )

    return {
      sessionId,
      batchSequence: batch.batchSequence,
      acceptedEvents: batch.events.length,
      totalEvents: orderedBatches.reduce((total, current) => total + current.batch.events.length, 0),
      totalBatches: orderedBatches.length,
    }
  }

  async loadSessionHistory(sessionId: string): Promise<HistorySessionRecord | null> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    const orderedBatches = [...session.batches.values()].sort(
      (left, right) => left.batch.batchSequence - right.batch.batchSequence,
    )

    return {
      sessionId,
      language: session.language,
      batches: orderedBatches.map(cloneBatchRecord),
      events: orderedBatches.flatMap((batch) => batch.batch.events),
    }
  }
}
