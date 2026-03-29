import type { AuthenticatedUser } from './auth.js'
import { AuthorizationError } from './errors.js'
import type { CreateJavaGradingJobInput, JavaGradingRepository } from './javaGradingRepository.js'
import type { JavaGradingRecord, JavaGradingResult } from './javaGradingTypes.js'

function cloneRecord(record: JavaGradingRecord): JavaGradingRecord {
  return structuredClone(record)
}

function nowIso() {
  return new Date().toISOString()
}

function createJobId() {
  return `grade-java-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export class InMemoryJavaGradingRepository implements JavaGradingRepository {
  private readonly jobs = new Map<string, JavaGradingRecord>()

  async createJob(input: CreateJavaGradingJobInput): Promise<JavaGradingRecord> {
    const createdAt = nowIso()
    const job: JavaGradingRecord = {
      gradingJobId: createJobId(),
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

    this.jobs.set(job.gradingJobId, cloneRecord(job))
    return cloneRecord(job)
  }

  async getJob(gradingJobId: string, owner: AuthenticatedUser): Promise<JavaGradingRecord | null> {
    const job = this.jobs.get(gradingJobId)

    if (!job) {
      return null
    }

    if (job.ownerUid !== owner.uid) {
      throw new AuthorizationError('Authenticated user does not own this Java grading job.')
    }

    return cloneRecord(job)
  }

  async markJobRunning(gradingJobId: string): Promise<JavaGradingRecord> {
    const job = this.requireJob(gradingJobId)
    const updatedAt = nowIso()

    job.status = 'running'
    job.startedAt ??= updatedAt
    job.updatedAt = updatedAt
    this.jobs.set(gradingJobId, cloneRecord(job))
    return cloneRecord(job)
  }

  async completeJob(gradingJobId: string, result: JavaGradingResult): Promise<JavaGradingRecord> {
    const job = this.requireJob(gradingJobId)
    const completedAt = nowIso()

    job.status = result.overallStatus
    job.result = structuredClone(result)
    job.errorMessage = result.overallStatus === 'error' ? result.summary : null
    job.startedAt ??= completedAt
    job.completedAt = completedAt
    job.updatedAt = completedAt
    this.jobs.set(gradingJobId, cloneRecord(job))
    return cloneRecord(job)
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

  private requireJob(gradingJobId: string) {
    const job = this.jobs.get(gradingJobId)

    if (!job) {
      throw new Error(`Java grading job ${gradingJobId} was not found.`)
    }

    return cloneRecord(job)
  }
}
