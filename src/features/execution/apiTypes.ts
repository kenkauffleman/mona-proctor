import type { ExecutionRecord } from '../../../backend/executionTypes'

export type ExecutionJobResponse = {
  job: ExecutionRecord
}

export type LatestExecutionJobResponse = {
  job: ExecutionRecord | null
}
