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
  ExecutionLanguage,
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

  private validateCreateRequest(request: CreateExecutionRequest) {
    const languageLimits = this.limits.languageLimits[request.language as ExecutionLanguage]

    if (!languageLimits) {
      throw new ExecutionValidationError(`Unsupported execution language: ${request.language}.`)
    }

    if (request.source.trim().length === 0) {
      throw new ExecutionValidationError('Execution source must not be empty.')
    }

    if (byteLength(request.source) > languageLimits.maxSourceBytes) {
      throw new ExecutionValidationError(
        `Execution source exceeds the configured limit of ${languageLimits.maxSourceBytes} bytes for ${request.language}.`,
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
