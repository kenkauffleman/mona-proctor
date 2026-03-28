import type { BackendConfig } from './config.js'
import { CloudRunJobExecutionBackend } from './cloudRunJobExecutionBackend.js'
import type { ExecutionBackend } from './executionBackend.js'
import { DisabledExecutionBackend } from './disabledExecutionBackend.js'
import { LocalContainerExecutionBackend } from './localContainerExecutionBackend.js'

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

  if (config.executionBackend === 'local-container') {
    if (!config.executionLocalContainerImageName) {
      throw new Error('Local container execution backend requires EXECUTION_LOCAL_CONTAINER_IMAGE_NAME.')
    }

    return new LocalContainerExecutionBackend({
      addHostGateway: config.executionLocalContainerAddHostGateway,
      dockerCommand: config.executionLocalContainerDockerCommand,
      firestoreEmulatorHost: config.firestoreEmulatorHost,
      imageName: config.executionLocalContainerImageName,
      maxStderrBytes: config.executionMaxStderrBytes,
      maxStdoutBytes: config.executionMaxStdoutBytes,
      network: config.executionLocalContainerNetwork,
      projectId: config.projectId,
      timeoutMs: config.executionTimeoutMs,
    })
  }

  return new DisabledExecutionBackend()
}
