import { Firestore } from '@google-cloud/firestore'
import type {
  AppendHistoryBatchInput,
  AppendHistoryBatchResult,
  HistoryBatchRecord,
  HistoryRepository,
  HistorySessionRecord,
} from './historyRepository.js'
import type { AuthenticatedUser } from './auth.js'
import { AuthorizationError } from './errors.js'

type FirestoreSessionDocument = {
  createdAt: string
  language: AppendHistoryBatchInput['language']
  ownerUid: string
  sessionId: string
  updatedAt: string
}

type FirestoreBatchDocument = {
  batchSequence: number
  eventCount: number
  eventOffset: number
  events: AppendHistoryBatchInput['events']
  language: AppendHistoryBatchInput['language']
  sessionId: string
  uploadedAt: string
}

const sessionsCollection = 'historySessions'
const batchesSubcollection = 'batches'

export class FirestoreHistoryRepository implements HistoryRepository {
  private readonly firestore: Firestore

  constructor(private readonly projectId: string) {
    this.firestore = new Firestore({ projectId })
  }

  async appendHistoryBatch(
    sessionId: string,
    owner: AuthenticatedUser,
    batch: AppendHistoryBatchInput,
  ): Promise<AppendHistoryBatchResult> {
    const sessionReference = this.firestore.collection(sessionsCollection).doc(sessionId)
    const batchReference = sessionReference.collection(batchesSubcollection).doc(String(batch.batchSequence))
    const now = new Date().toISOString()
    const sessionSnapshot = await sessionReference.get()

    if (sessionSnapshot.exists) {
      const sessionData = sessionSnapshot.data() as FirestoreSessionDocument | undefined

      if (sessionData?.language && sessionData.language !== batch.language) {
        throw new Error('Session language cannot change after the first uploaded batch.')
      }

      if (sessionData?.ownerUid && sessionData.ownerUid !== owner.uid) {
        throw new AuthorizationError('Authenticated user does not own this session.')
      }
    }

    const existingBatchSnapshot = await batchReference.get()

    if (existingBatchSnapshot.exists) {
      const existingBatch = existingBatchSnapshot.data() as FirestoreBatchDocument | undefined

      if (JSON.stringify(existingBatch) !== JSON.stringify(this.toBatchDocument(sessionId, batch, existingBatch?.uploadedAt ?? now))) {
        throw new Error('Batch sequence already exists with different history payload.')
      }
    } else {
      await batchReference.set(this.toBatchDocument(sessionId, batch, now))
    }

    await sessionReference.set(
      {
        sessionId,
        language: batch.language,
        ownerUid: sessionSnapshot.exists
          ? (sessionSnapshot.data() as FirestoreSessionDocument | undefined)?.ownerUid ?? owner.uid
          : owner.uid,
        createdAt: sessionSnapshot.exists
          ? (sessionSnapshot.data() as FirestoreSessionDocument | undefined)?.createdAt ?? now
          : now,
        updatedAt: now,
      } satisfies FirestoreSessionDocument,
      { merge: true },
    )

    return {
      sessionId,
      batchSequence: batch.batchSequence,
      acceptedEvents: batch.events.length,
      totalEvents: batch.eventOffset + batch.events.length,
      totalBatches: batch.batchSequence,
      ownerUid: sessionSnapshot.exists
        ? (sessionSnapshot.data() as FirestoreSessionDocument | undefined)?.ownerUid ?? owner.uid
        : owner.uid,
    }
  }

  async loadSessionHistory(sessionId: string, owner: AuthenticatedUser): Promise<HistorySessionRecord | null> {
    const sessionReference = this.firestore.collection(sessionsCollection).doc(sessionId)
    const sessionSnapshot = await sessionReference.get()

    if (!sessionSnapshot.exists) {
      return null
    }

    const sessionData = sessionSnapshot.data() as FirestoreSessionDocument | undefined

    if (!sessionData) {
      throw new Error('Stored session metadata was empty.')
    }

    if (sessionData.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this session.')
    }

    const batchesSnapshot = await sessionReference
      .collection(batchesSubcollection)
      .orderBy('batchSequence', 'asc')
      .get()

    const batches = batchesSnapshot.docs.map((document) => document.data() as FirestoreBatchDocument)

    return {
      sessionId,
      language: sessionData.language,
      ownerUid: sessionData.ownerUid,
      batches: batches.map((batch): HistoryBatchRecord => ({
        batchSequence: batch.batchSequence,
        eventOffset: batch.eventOffset,
        eventCount: batch.eventCount,
        uploadedAt: batch.uploadedAt,
      })),
      events: batches.flatMap((batch) => batch.events),
    }
  }

  private toBatchDocument(
    sessionId: string,
    batch: AppendHistoryBatchInput,
    uploadedAt: string,
  ): FirestoreBatchDocument {
    return {
      sessionId,
      language: batch.language,
      batchSequence: batch.batchSequence,
      eventOffset: batch.eventOffset,
      eventCount: batch.events.length,
      events: batch.events,
      uploadedAt,
    }
  }
}
