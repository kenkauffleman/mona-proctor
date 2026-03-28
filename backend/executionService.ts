import type { AuthenticatedUser } from './auth.js'
import type { ExecutionBackend } from './executionBackend.js'
import {
  ExecutionConflictError,
  ExecutionValidationError,
} from './executionErrors.js'
import type { ExecutionRepository } from './executionRepository.js'
import type {
  CreateExecutionRequest,
  ExecutionLimits,
  ExecutionRecord,
} from './executionTypes.js'

function byteLength(value: string) {
  return new TextEncoder().encode(value).length
}

export class ExecutionService {
  constructor(
    private readonly repository: ExecutionRepository,
    private readonly backend: ExecutionBackend,
    private readonly limits: ExecutionLimits,
  ) {}

  async submitExecution(
    owner: AuthenticatedUser,
    request: CreateExecutionRequest,
  ): Promise<ExecutionRecord> {
    this.validateCreateRequest(request)

    const job = await this.repository.createJob({
      request,
      owner,
      backend: this.backend.name,
      globalActiveJobLimit: this.limits.globalActiveJobLimit,
    })

    try {
      const dispatchResult = await this.backend.dispatch(job)
      return this.repository.markJobDispatched({
        jobId: job.jobId,
        backendJobName: dispatchResult.backendJobName,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution dispatch failed.'
      return this.repository.failJob(job.jobId, message)
    }
  }

  getExecutionJob(jobId: string, owner: AuthenticatedUser) {
    return this.repository.getJob(jobId, owner)
  }

  getLatestExecutionJob(owner: AuthenticatedUser) {
    return this.repository.getLatestJob(owner)
  }

  private validateCreateRequest(request: CreateExecutionRequest) {
    if (request.language !== 'python') {
      throw new ExecutionValidationError('Only python execution is supported in Wave 12.')
    }

    if (request.source.trim().length === 0) {
      throw new ExecutionValidationError('Execution source must not be empty.')
    }

    if (byteLength(request.source) > this.limits.maxSourceBytes) {
      throw new ExecutionValidationError(
        `Execution source exceeds the configured limit of ${this.limits.maxSourceBytes} bytes.`,
      )
    }
  }
}

export function executionErrorStatusCode(error: unknown) {
  if (error instanceof ExecutionValidationError) {
    return 400
  }

  if (error instanceof ExecutionConflictError) {
    return 409
  }

  return 500
}
