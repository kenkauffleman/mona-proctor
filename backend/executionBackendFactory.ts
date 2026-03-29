import type { BackendConfig } from './config.js'
import { CloudRunJobExecutionBackend } from './cloudRunJobExecutionBackend.js'
import type { ExecutionBackend } from './executionBackend.js'
import { DisabledExecutionBackend } from './disabledExecutionBackend.js'
import { LocalContainerExecutionBackend } from './localContainerExecutionBackend.js'

export function createExecutionBackend(config: BackendConfig): ExecutionBackend {
  if (config.executionBackend === 'cloud-run-job') {
    if (
      !config.executionCloudRunPythonJobName
      || !config.executionCloudRunJavaJobName
      || !config.executionCloudRunRegion
    ) {
      throw new Error('Cloud Run execution backend requires EXECUTION_CLOUD_RUN_PYTHON_JOB_NAME, EXECUTION_CLOUD_RUN_JAVA_JOB_NAME, and EXECUTION_CLOUD_RUN_REGION.')
    }

    return new CloudRunJobExecutionBackend({
      jobs: {
        python: { backendJobNameOrImage: config.executionCloudRunPythonJobName },
        java: { backendJobNameOrImage: config.executionCloudRunJavaJobName },
      },
      projectId: config.executionCloudRunProjectId ?? config.projectId,
      region: config.executionCloudRunRegion,
    })
  }

  if (config.executionBackend === 'local-container') {
    if (!config.executionLocalContainerPythonImageName || !config.executionLocalContainerJavaImageName) {
      throw new Error('Local container execution backend requires EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME and EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME.')
    }

    return new LocalContainerExecutionBackend({
      addHostGateway: config.executionLocalContainerAddHostGateway,
      dockerCommand: config.executionLocalContainerDockerCommand,
      firestoreEmulatorHost: config.firestoreEmulatorHost,
      images: {
        python: { backendJobNameOrImage: config.executionLocalContainerPythonImageName },
        java: { backendJobNameOrImage: config.executionLocalContainerJavaImageName },
      },
      javaMaxMemoryMb: config.javaExecutionMaxMemoryMb,
      javaMaxStderrBytes: config.javaExecutionMaxStderrBytes,
      javaMaxStdoutBytes: config.javaExecutionMaxStdoutBytes,
      javaTimeoutMs: config.javaExecutionTimeoutMs,
      maxStderrBytes: config.executionMaxStderrBytes,
      maxStdoutBytes: config.executionMaxStdoutBytes,
      network: config.executionLocalContainerNetwork,
      projectId: config.projectId,
      timeoutMs: config.executionTimeoutMs,
    })
  }

  return new DisabledExecutionBackend()
}
