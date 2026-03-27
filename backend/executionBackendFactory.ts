import type { BackendConfig } from './config.js'
import { CloudRunJobExecutionBackend } from './cloudRunJobExecutionBackend.js'
import type { ExecutionBackend } from './executionBackend.js'
import { DisabledExecutionBackend } from './disabledExecutionBackend.js'

export function createExecutionBackend(config: BackendConfig): ExecutionBackend {
  if (config.executionBackend === 'cloud-run-job') {
    if (!config.executionCloudRunJobName || !config.executionCloudRunRegion) {
      throw new Error('Cloud Run execution backend requires EXECUTION_CLOUD_RUN_JOB_NAME and EXECUTION_CLOUD_RUN_REGION.')
    }

    return new CloudRunJobExecutionBackend({
      jobName: config.executionCloudRunJobName,
      projectId: config.executionCloudRunProjectId ?? config.projectId,
      region: config.executionCloudRunRegion,
    })
  }

  return new DisabledExecutionBackend()
}
