import type { ExecutionRecord } from './executionTypes.js'

export type ExecutionDispatchResult = {
  backendJobName: string | null
}

export type ExecutionBackendOptionsByLanguage = Record<ExecutionRecord['language'], {
  backendJobNameOrImage: string
}>

export interface ExecutionBackend {
  readonly name: string
  dispatch(job: ExecutionRecord): Promise<ExecutionDispatchResult>
}
