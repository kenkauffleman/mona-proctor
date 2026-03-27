import type { CreateExecutionRequest, ExecutionRecord } from './executionTypes.js'

export type CreateExecutionJobRequest = CreateExecutionRequest

export type ExecutionJobResponse = {
  job: ExecutionRecord
}
