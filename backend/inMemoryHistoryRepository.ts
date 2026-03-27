import type {
  AppendHistoryBatchInput,
  AppendHistoryBatchResult,
  HistoryBatchRecord,
  HistoryRepository,
  HistorySessionRecord,
} from './historyRepository.js'
import type { AuthenticatedUser } from './auth.js'
import { AuthorizationError } from './errors.js'

type StoredBatch = {
  batch: AppendHistoryBatchInput
  uploadedAt: string
}

type StoredSession = {
  language: AppendHistoryBatchInput['language']
  ownerUid: string
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
    owner: AuthenticatedUser,
    batch: AppendHistoryBatchInput,
  ): Promise<AppendHistoryBatchResult> {
    const session = this.sessions.get(sessionId) ?? {
      language: batch.language,
      ownerUid: owner.uid,
      batches: new Map<number, StoredBatch>(),
    }

    if (session.language !== batch.language) {
      throw new Error('Session language cannot change after the first uploaded batch.')
    }

    if (session.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this session.')
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
      ownerUid: session.ownerUid,
    }
  }

  async loadSessionHistory(sessionId: string, owner: AuthenticatedUser): Promise<HistorySessionRecord | null> {
    const session = this.sessions.get(sessionId)

    if (!session) {
      return null
    }

    if (session.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this session.')
    }

    const orderedBatches = [...session.batches.values()].sort(
      (left, right) => left.batch.batchSequence - right.batch.batchSequence,
    )

    return {
      sessionId,
      language: session.language,
      ownerUid: session.ownerUid,
      batches: orderedBatches.map(cloneBatchRecord),
      events: orderedBatches.flatMap((batch) => batch.batch.events),
    }
  }
}
