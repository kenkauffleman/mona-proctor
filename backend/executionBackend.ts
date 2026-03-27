import type { ExecutionRecord } from './executionTypes.js'

export type ExecutionDispatchResult = {
  backendJobName: string | null
}

export interface ExecutionBackend {
  readonly name: string
  dispatch(job: ExecutionRecord): Promise<ExecutionDispatchResult>
}
