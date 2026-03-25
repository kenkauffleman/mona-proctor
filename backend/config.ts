export type BackendConfig = {
  firestoreEmulatorHost?: string
  port: number
  projectId: string
}

export function getBackendConfig(environment: NodeJS.ProcessEnv = process.env): BackendConfig {
  return {
    firestoreEmulatorHost: environment.FIRESTORE_EMULATOR_HOST,
    port: Number(environment.PORT ?? 8081),
    projectId: environment.GCLOUD_PROJECT ?? 'demo-mona-proctor',
  }
}
