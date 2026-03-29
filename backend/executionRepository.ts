import type { AuthenticatedUser } from './auth.js'
import type {
  CreateExecutionRequest,
  ExecutionRecord,
  ExecutionResult,
  InternalExecutionOptions,
  RunnerExecutionRecord,
} from './executionTypes.js'

export type CreateExecutionJobInput = {
  request: CreateExecutionRequest
  owner: AuthenticatedUser
  backend: string
  globalActiveJobLimit: number
  internalOptions?: InternalExecutionOptions
}

export type MarkExecutionDispatchedInput = {
  jobId: string
  backendJobName: string | null
}

export type CompleteExecutionJobInput = {
  jobId: string
  result: ExecutionResult
}

export interface ExecutionRepository {
  createJob(input: CreateExecutionJobInput): Promise<ExecutionRecord>
  getJob(jobId: string, owner: AuthenticatedUser): Promise<ExecutionRecord | null>
  getJobForRunner(jobId: string): Promise<RunnerExecutionRecord | null>
  markJobRunning(jobId: string): Promise<ExecutionRecord>
  markJobDispatched(input: MarkExecutionDispatchedInput): Promise<ExecutionRecord>
  completeJob(input: CompleteExecutionJobInput): Promise<ExecutionRecord>
  failJob(jobId: string, message: string): Promise<ExecutionRecord>
}
