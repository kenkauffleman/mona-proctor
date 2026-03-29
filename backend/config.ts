export type BackendConfig = {
  allowedOrigins: string[]
  cloudRunConfiguration?: string
  cloudRunRevision?: string
  cloudRunService?: string
  executionBackend: string
  executionCloudRunJavaJobName?: string
  executionCloudRunPythonJobName?: string
  executionCloudRunRegion?: string
  executionCloudRunProjectId?: string
  executionLocalContainerAddHostGateway: boolean
  executionLocalContainerDockerCommand: string
  executionLocalContainerJavaImageName?: string
  executionLocalContainerNetwork?: string
  executionLocalContainerPythonImageName?: string
  executionGlobalActiveJobLimit: number
  executionMaxSourceBytes: number
  executionMaxStderrBytes: number
  executionMaxStdoutBytes: number
  executionTimeoutMs: number
  javaExecutionMaxMemoryMb: number
  javaExecutionMaxSourceBytes: number
  javaExecutionMaxStderrBytes: number
  javaExecutionMaxStdoutBytes: number
  javaExecutionTimeoutMs: number
  firebaseAuthEmulatorHost?: string
  firestoreEmulatorHost?: string
  port: number
  projectId: string
}

function parseAllowedOrigins(value: string | undefined) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

export function getBackendConfig(environment: NodeJS.ProcessEnv = process.env): BackendConfig {
  return {
    allowedOrigins: parseAllowedOrigins(environment.ALLOWED_ORIGINS),
    cloudRunConfiguration: environment.K_CONFIGURATION,
    cloudRunRevision: environment.K_REVISION,
    cloudRunService: environment.K_SERVICE,
    executionBackend: environment.EXECUTION_BACKEND ?? 'disabled',
    executionCloudRunJavaJobName: environment.EXECUTION_CLOUD_RUN_JAVA_JOB_NAME,
    executionCloudRunPythonJobName: environment.EXECUTION_CLOUD_RUN_PYTHON_JOB_NAME,
    executionCloudRunRegion: environment.EXECUTION_CLOUD_RUN_REGION,
    executionCloudRunProjectId: environment.EXECUTION_CLOUD_RUN_PROJECT_ID,
    executionLocalContainerAddHostGateway: environment.EXECUTION_LOCAL_CONTAINER_ADD_HOST_GATEWAY !== 'false',
    executionLocalContainerDockerCommand: environment.EXECUTION_LOCAL_CONTAINER_DOCKER_COMMAND ?? 'docker',
    executionLocalContainerJavaImageName: environment.EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME,
    executionLocalContainerNetwork: environment.EXECUTION_LOCAL_CONTAINER_NETWORK,
    executionLocalContainerPythonImageName: environment.EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME,
    executionGlobalActiveJobLimit: Number(environment.EXECUTION_GLOBAL_ACTIVE_JOB_LIMIT ?? 10),
    executionMaxSourceBytes: Number(environment.EXECUTION_MAX_SOURCE_BYTES ?? 16_384),
    executionMaxStderrBytes: Number(environment.EXECUTION_MAX_STDERR_BYTES ?? 4_096),
    executionMaxStdoutBytes: Number(environment.EXECUTION_MAX_STDOUT_BYTES ?? 8_192),
    executionTimeoutMs: Number(environment.EXECUTION_TIMEOUT_MS ?? 5_000),
    javaExecutionMaxMemoryMb: Number(environment.JAVA_EXECUTION_MAX_MEMORY_MB ?? 128),
    javaExecutionMaxSourceBytes: Number(environment.JAVA_EXECUTION_MAX_SOURCE_BYTES ?? 24_576),
    javaExecutionMaxStderrBytes: Number(environment.JAVA_EXECUTION_MAX_STDERR_BYTES ?? 6_144),
    javaExecutionMaxStdoutBytes: Number(environment.JAVA_EXECUTION_MAX_STDOUT_BYTES ?? 8_192),
    javaExecutionTimeoutMs: Number(environment.JAVA_EXECUTION_TIMEOUT_MS ?? 6_000),
    firebaseAuthEmulatorHost: environment.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: environment.FIRESTORE_EMULATOR_HOST,
    port: Number(environment.PORT ?? 8081),
    projectId: environment.GCLOUD_PROJECT ?? 'demo-mona-proctor',
  }
}
