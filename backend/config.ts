export type BackendConfig = {
  cloudRunConfiguration?: string
  cloudRunRevision?: string
  cloudRunService?: string
  firestoreEmulatorHost?: string
  port: number
  projectId: string
}

export function getBackendConfig(environment: NodeJS.ProcessEnv = process.env): BackendConfig {
  return {
    cloudRunConfiguration: environment.K_CONFIGURATION,
    cloudRunRevision: environment.K_REVISION,
    cloudRunService: environment.K_SERVICE,
    firestoreEmulatorHost: environment.FIRESTORE_EMULATOR_HOST,
    port: Number(environment.PORT ?? 8081),
    projectId: environment.GCLOUD_PROJECT ?? 'demo-mona-proctor',
  }
}
