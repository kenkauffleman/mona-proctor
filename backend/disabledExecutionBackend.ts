import type { ExecutionBackend, ExecutionDispatchResult } from './executionBackend.js'
import type { ExecutionRecord } from './executionTypes.js'

export class DisabledExecutionBackend implements ExecutionBackend {
  readonly name = 'disabled'

  async dispatch(job: ExecutionRecord): Promise<ExecutionDispatchResult> {
    void job
    throw new Error('Execution backend is not configured.')
  }
}
