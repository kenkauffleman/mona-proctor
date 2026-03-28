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
} from './executionTypes.js'

function cloneRecord(record: ExecutionRecord): ExecutionRecord {
  return structuredClone(record)
}

function nowIso() {
  return new Date().toISOString()
}

function createJobId() {
  return `exec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export class InMemoryExecutionRepository implements ExecutionRepository {
  private readonly jobs = new Map<string, ExecutionRecord>()
  private readonly activeJobIdsByOwner = new Map<string, string>()

  async createJob(input: CreateExecutionJobInput): Promise<ExecutionRecord> {
    if (this.activeJobIdsByOwner.has(input.owner.uid)) {
      throw new ExecutionConflictError('Authenticated user already has an active execution job.')
    }

    if (this.activeJobIdsByOwner.size >= input.globalActiveJobLimit) {
      throw new ExecutionConflictError('The execution system is at the configured active job limit.')
    }

    const createdAt = nowIso()
    const job: ExecutionRecord = {
      jobId: createJobId(),
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

    this.jobs.set(job.jobId, cloneRecord(job))
    this.activeJobIdsByOwner.set(job.ownerUid, job.jobId)

    return cloneRecord(job)
  }

  async getJob(jobId: string, owner: AuthenticatedUser): Promise<ExecutionRecord | null> {
    const job = this.jobs.get(jobId)

    if (!job) {
      return null
    }

    if (job.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this execution job.')
    }

    return cloneRecord(job)
  }

  async getLatestJob(owner: AuthenticatedUser): Promise<ExecutionRecord | null> {
    const ownedJobs = [...this.jobs.values()]
      .filter((job) => job.ownerUid === owner.uid)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

    return ownedJobs[0] ? cloneRecord(ownedJobs[0]) : null
  }

  async getJobForRunner(jobId: string): Promise<ExecutionRecord | null> {
    const job = this.jobs.get(jobId)
    return job ? cloneRecord(job) : null
  }

  async markJobRunning(jobId: string): Promise<ExecutionRecord> {
    const job = this.requireJob(jobId)
    const updatedAt = nowIso()

    job.status = 'running'
    job.startedAt ??= updatedAt
    job.updatedAt = updatedAt

    this.jobs.set(jobId, cloneRecord(job))
    return cloneRecord(job)
  }

  async markJobDispatched(input: MarkExecutionDispatchedInput): Promise<ExecutionRecord> {
    const job = this.requireJob(input.jobId)
    job.backendJobName = input.backendJobName
    job.updatedAt = nowIso()
    this.jobs.set(job.jobId, cloneRecord(job))
    return cloneRecord(job)
  }

  async completeJob(input: CompleteExecutionJobInput): Promise<ExecutionRecord> {
    const job = this.requireJob(input.jobId)
    const completedAt = nowIso()

    job.status = input.result.status
    job.result = structuredClone(input.result)
    job.errorMessage = null
    job.startedAt ??= completedAt
    job.completedAt = completedAt
    job.updatedAt = completedAt

    this.jobs.set(job.jobId, cloneRecord(job))
    this.clearActiveJob(job)
    return cloneRecord(job)
  }

  async failJob(jobId: string, message: string): Promise<ExecutionRecord> {
    const stderr = message.trim()
    const result: ExecutionResult = {
      status: 'error',
      stdout: '',
      stderr,
      exitCode: null,
      durationMs: null,
      truncated: false,
    }

    const job = await this.completeJob({
      jobId,
      result,
    })
    job.errorMessage = stderr
    this.jobs.set(job.jobId, cloneRecord(job))
    return cloneRecord(job)
  }

  private requireJob(jobId: string) {
    const job = this.jobs.get(jobId)

    if (!job) {
      throw new Error(`Execution job ${jobId} was not found.`)
    }

    return cloneRecord(job)
  }

  private clearActiveJob(job: ExecutionRecord) {
    const activeJobId = this.activeJobIdsByOwner.get(job.ownerUid)

    if (activeJobId === job.jobId) {
      this.activeJobIdsByOwner.delete(job.ownerUid)
    }
  }
}
