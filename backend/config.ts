export type BackendConfig = {
  allowedOrigins: string[]
  cloudRunConfiguration?: string
  cloudRunRevision?: string
  cloudRunService?: string
  executionBackend: string
  executionCloudRunJobName?: string
  executionCloudRunRegion?: string
  executionCloudRunProjectId?: string
  executionGlobalActiveJobLimit: number
  executionMaxSourceBytes: number
  executionMaxStderrBytes: number
  executionMaxStdoutBytes: number
  executionTimeoutMs: number
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
    executionCloudRunJobName: environment.EXECUTION_CLOUD_RUN_JOB_NAME,
    executionCloudRunRegion: environment.EXECUTION_CLOUD_RUN_REGION,
    executionCloudRunProjectId: environment.EXECUTION_CLOUD_RUN_PROJECT_ID,
    executionGlobalActiveJobLimit: Number(environment.EXECUTION_GLOBAL_ACTIVE_JOB_LIMIT ?? 10),
    executionMaxSourceBytes: Number(environment.EXECUTION_MAX_SOURCE_BYTES ?? 16_384),
    executionMaxStderrBytes: Number(environment.EXECUTION_MAX_STDERR_BYTES ?? 4_096),
    executionMaxStdoutBytes: Number(environment.EXECUTION_MAX_STDOUT_BYTES ?? 8_192),
    executionTimeoutMs: Number(environment.EXECUTION_TIMEOUT_MS ?? 5_000),
    firebaseAuthEmulatorHost: environment.FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulatorHost: environment.FIRESTORE_EMULATOR_HOST,
    port: Number(environment.PORT ?? 8081),
    projectId: environment.GCLOUD_PROJECT ?? 'demo-mona-proctor',
  }
}
