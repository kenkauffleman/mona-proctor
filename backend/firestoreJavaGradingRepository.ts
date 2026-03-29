import { Firestore } from '@google-cloud/firestore'
import type { AuthenticatedUser } from './auth.js'
import { AuthorizationError } from './errors.js'
import type { CreateJavaGradingJobInput, JavaGradingRepository } from './javaGradingRepository.js'
import type { JavaGradingRecord, JavaGradingResult, JavaGradingStatus } from './javaGradingTypes.js'

type FirestoreJavaGradingJobDocument = {
  gradingJobId: string
  ownerUid: string
  language: 'java'
  problemId: string
  source: string
  sourceSizeBytes: number
  status: JavaGradingStatus
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  result: JavaGradingResult | null
}

const javaGradingJobsCollection = 'javaGradingJobs'

function nowIso() {
  return new Date().toISOString()
}

function createJobId() {
  return `grade-java-${Date.now()}-${crypto.randomUUID()}`
}

function gradingRecordFromDocument(document: FirestoreJavaGradingJobDocument): JavaGradingRecord {
  return structuredClone(document)
}

export class FirestoreJavaGradingRepository implements JavaGradingRepository {
  private readonly firestore: Firestore

  constructor(projectId: string) {
    this.firestore = new Firestore({ projectId })
  }

  async createJob(input: CreateJavaGradingJobInput): Promise<JavaGradingRecord> {
    const gradingJobId = createJobId()
    const createdAt = nowIso()
    const record: FirestoreJavaGradingJobDocument = {
      gradingJobId,
      ownerUid: input.owner.uid,
      language: 'java',
      problemId: input.problemId,
      source: input.source,
      sourceSizeBytes: new TextEncoder().encode(input.source).length,
      status: 'queued',
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      result: null,
    }

    await this.firestore.collection(javaGradingJobsCollection).doc(gradingJobId).set(record)
    return gradingRecordFromDocument(record)
  }

  async getJob(gradingJobId: string, owner: AuthenticatedUser): Promise<JavaGradingRecord | null> {
    const snapshot = await this.firestore.collection(javaGradingJobsCollection).doc(gradingJobId).get()

    if (!snapshot.exists) {
      return null
    }

    const document = snapshot.data() as FirestoreJavaGradingJobDocument | undefined

    if (!document) {
      throw new Error('Stored Java grading job document was empty.')
    }

    if (document.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this Java grading job.')
    }

    return gradingRecordFromDocument(document)
  }

  async markJobRunning(gradingJobId: string): Promise<JavaGradingRecord> {
    const reference = this.firestore.collection(javaGradingJobsCollection).doc(gradingJobId)

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference)
      const document = snapshot.data() as FirestoreJavaGradingJobDocument | undefined

      if (!snapshot.exists || !document) {
        throw new Error(`Java grading job ${gradingJobId} was not found.`)
      }

      const updatedAt = nowIso()
      const nextRecord: FirestoreJavaGradingJobDocument = {
        ...document,
        status: 'running',
        startedAt: document.startedAt ?? updatedAt,
        updatedAt,
      }

      transaction.set(reference, nextRecord)
      return nextRecord
    }).then(gradingRecordFromDocument)
  }

  async completeJob(gradingJobId: string, result: JavaGradingResult): Promise<JavaGradingRecord> {
    const reference = this.firestore.collection(javaGradingJobsCollection).doc(gradingJobId)

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference)
      const document = snapshot.data() as FirestoreJavaGradingJobDocument | undefined

      if (!snapshot.exists || !document) {
        throw new Error(`Java grading job ${gradingJobId} was not found.`)
      }

      const completedAt = nowIso()
      const nextRecord: FirestoreJavaGradingJobDocument = {
        ...document,
        status: result.overallStatus,
        result: structuredClone(result),
        errorMessage: result.overallStatus === 'error' ? result.summary : null,
        startedAt: document.startedAt ?? completedAt,
        completedAt,
        updatedAt: completedAt,
      }

      transaction.set(reference, nextRecord)
      return nextRecord
    }).then(gradingRecordFromDocument)
  }

  async failJob(gradingJobId: string, message: string): Promise<JavaGradingRecord> {
    const result: JavaGradingResult = {
      compileFailed: false,
      overallStatus: 'error',
      summary: message,
      passedTests: 0,
      totalTests: 0,
      tests: [],
    }

    return this.completeJob(gradingJobId, result)
  }
}
