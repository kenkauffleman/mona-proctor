import { Firestore } from '@google-cloud/firestore'
import type { AuthenticatedUser } from './auth.js'
import { AuthorizationError } from './errors.js'
import { ExecutionConflictError } from './executionErrors.js'
import type {
  CompleteExecutionJobInput,
  CreateExecutionJobInput,
  ExecutionRepository,
  MarkExecutionDispatchedInput,
} from './executionRepository.js'
import type {
  ExecutionRecord,
  ExecutionResult,
  ExecutionStatus,
} from './executionTypes.js'

type FirestoreExecutionJobDocument = {
  jobId: string
  ownerUid: string
  language: ExecutionRecord['language']
  source: string
  sourceSizeBytes: number
  status: ExecutionStatus
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  backend: string
  backendJobName: string | null
  errorMessage: string | null
  result: ExecutionResult | null
}

type FirestoreActiveExecutionDocument = {
  jobId: string
  ownerUid: string
  updatedAt: string
}

type FirestoreExecutionSystemDocument = {
  activeJobCount: number
  updatedAt: string
}

type FirestoreExecutionQueueDocument = {
  createdAt: string
  jobId: string
}

const executionJobsCollection = 'executionJobs'
const activeExecutionsCollection = 'executionActiveUsers'
const executionQueueCollection = 'executionQueue'
const executionSystemCollection = 'executionSystem'
const executionSystemStatsDocument = 'stats'

function nowIso() {
  return new Date().toISOString()
}

function createJobId() {
  return `exec-${Date.now()}-${crypto.randomUUID()}`
}

function executionRecordFromDocument(document: FirestoreExecutionJobDocument): ExecutionRecord {
  return structuredClone(document)
}

export class FirestoreExecutionRepository implements ExecutionRepository {
  private readonly firestore: Firestore

  constructor(private readonly projectId: string) {
    this.firestore = new Firestore({ projectId })
  }

  async createJob(input: CreateExecutionJobInput): Promise<ExecutionRecord> {
    const jobId = createJobId()
    const jobReference = this.firestore.collection(executionJobsCollection).doc(jobId)
    const queueReference = this.firestore.collection(executionQueueCollection).doc(jobId)
    const ownerActiveReference = this.firestore.collection(activeExecutionsCollection).doc(input.owner.uid)
    const systemStatsReference = this.firestore
      .collection(executionSystemCollection)
      .doc(executionSystemStatsDocument)

    const record = await this.firestore.runTransaction(async (transaction) => {
      const [existingActiveSnapshot, systemStatsSnapshot] = await Promise.all([
        transaction.get(ownerActiveReference),
        transaction.get(systemStatsReference),
      ])

      if (existingActiveSnapshot.exists) {
        throw new ExecutionConflictError('Authenticated user already has an active execution job.')
      }

      const activeJobCount = (
        systemStatsSnapshot.data() as FirestoreExecutionSystemDocument | undefined
      )?.activeJobCount ?? 0

      if (activeJobCount >= input.globalActiveJobLimit) {
        throw new ExecutionConflictError('The execution system is at the configured active job limit.')
      }

      const createdAt = nowIso()
      const recordToStore: FirestoreExecutionJobDocument = {
        jobId,
        ownerUid: input.owner.uid,
        language: input.request.language,
        source: input.request.source,
        sourceSizeBytes: new TextEncoder().encode(input.request.source).length,
        status: 'queued',
        createdAt,
        updatedAt: createdAt,
        startedAt: null,
        completedAt: null,
        backend: input.backend,
        backendJobName: null,
        errorMessage: null,
        result: null,
      }

      transaction.set(jobReference, recordToStore)
      transaction.set(queueReference, {
        jobId,
        createdAt,
      } satisfies FirestoreExecutionQueueDocument)
      transaction.set(ownerActiveReference, {
        jobId,
        ownerUid: input.owner.uid,
        updatedAt: createdAt,
      } satisfies FirestoreActiveExecutionDocument)
      transaction.set(systemStatsReference, {
        activeJobCount: activeJobCount + 1,
        updatedAt: createdAt,
      } satisfies FirestoreExecutionSystemDocument)

      return recordToStore
    })

    return executionRecordFromDocument(record)
  }

  async getJob(jobId: string, owner: AuthenticatedUser): Promise<ExecutionRecord | null> {
    const snapshot = await this.firestore.collection(executionJobsCollection).doc(jobId).get()

    if (!snapshot.exists) {
      return null
    }

    const document = snapshot.data() as FirestoreExecutionJobDocument | undefined

    if (!document) {
      throw new Error('Stored execution job document was empty.')
    }

    if (document.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this execution job.')
    }

    return executionRecordFromDocument(document)
  }

  async getJobForRunner(jobId: string): Promise<ExecutionRecord | null> {
    const snapshot = await this.firestore.collection(executionJobsCollection).doc(jobId).get()

    if (!snapshot.exists) {
      return null
    }

    const document = snapshot.data() as FirestoreExecutionJobDocument | undefined

    if (!document) {
      throw new Error('Stored execution job document was empty.')
    }

    return executionRecordFromDocument(document)
  }

  async markJobRunning(jobId: string): Promise<ExecutionRecord> {
    const jobReference = this.firestore.collection(executionJobsCollection).doc(jobId)
    const queueReference = this.firestore.collection(executionQueueCollection).doc(jobId)

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobReference)
      const document = snapshot.data() as FirestoreExecutionJobDocument | undefined

      if (!snapshot.exists || !document) {
        throw new Error(`Execution job ${jobId} was not found.`)
      }

      const updatedAt = nowIso()
      const nextRecord: FirestoreExecutionJobDocument = {
        ...document,
        status: 'running',
        startedAt: document.startedAt ?? updatedAt,
        updatedAt,
      }

      transaction.set(jobReference, nextRecord)
      transaction.delete(queueReference)
      return nextRecord
    }).then(executionRecordFromDocument)
  }

  async markJobDispatched(input: MarkExecutionDispatchedInput): Promise<ExecutionRecord> {
    const jobReference = this.firestore.collection(executionJobsCollection).doc(input.jobId)

    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobReference)
      const document = snapshot.data() as FirestoreExecutionJobDocument | undefined

      if (!snapshot.exists || !document) {
        throw new Error(`Execution job ${input.jobId} was not found.`)
      }

      const nextRecord: FirestoreExecutionJobDocument = {
        ...document,
        backendJobName: input.backendJobName,
        updatedAt: nowIso(),
      }

      transaction.set(jobReference, nextRecord)
      return nextRecord
    }).then(executionRecordFromDocument)
  }

  async completeJob(input: CompleteExecutionJobInput): Promise<ExecutionRecord> {
    const jobReference = this.firestore.collection(executionJobsCollection).doc(input.jobId)

    const record = await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(jobReference)
      const document = snapshot.data() as FirestoreExecutionJobDocument | undefined

      if (!snapshot.exists || !document) {
        throw new Error(`Execution job ${input.jobId} was not found.`)
      }

      const completedAt = nowIso()
      const nextRecord: FirestoreExecutionJobDocument = {
        ...document,
        status: input.result.status,
        result: structuredClone(input.result),
        errorMessage: input.result.status === 'error'
          ? input.result.stderr || 'Execution failed.'
          : null,
        startedAt: document.startedAt ?? completedAt,
        completedAt,
        updatedAt: completedAt,
      }

      transaction.set(jobReference, nextRecord)
      await this.releaseActiveJob(transaction, nextRecord)
      return nextRecord
    })

    return executionRecordFromDocument(record)
  }

  async failJob(jobId: string, message: string): Promise<ExecutionRecord> {
    return this.completeJob({
      jobId,
      result: {
        status: 'error',
        stdout: '',
        stderr: message.trim(),
        exitCode: null,
        durationMs: null,
        truncated: false,
      },
    })
  }

  private async releaseActiveJob(
    transaction: FirebaseFirestore.Transaction,
    job: FirestoreExecutionJobDocument,
  ) {
    const ownerActiveReference = this.firestore.collection(activeExecutionsCollection).doc(job.ownerUid)
    const queueReference = this.firestore.collection(executionQueueCollection).doc(job.jobId)
    const systemStatsReference = this.firestore
      .collection(executionSystemCollection)
      .doc(executionSystemStatsDocument)
    const [ownerActiveSnapshot, systemStatsSnapshot] = await Promise.all([
      transaction.get(ownerActiveReference),
      transaction.get(systemStatsReference),
    ])

    const activeDocument = ownerActiveSnapshot.data() as FirestoreActiveExecutionDocument | undefined

    if (activeDocument?.jobId === job.jobId) {
      transaction.delete(ownerActiveReference)
    }

    transaction.delete(queueReference)

    const activeJobCount = (
      systemStatsSnapshot.data() as FirestoreExecutionSystemDocument | undefined
    )?.activeJobCount ?? 0

    transaction.set(systemStatsReference, {
      activeJobCount: Math.max(0, activeJobCount - 1),
      updatedAt: nowIso(),
    } satisfies FirestoreExecutionSystemDocument)
  }
}
