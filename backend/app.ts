import express from 'express'

export type FirestoreValidationResponse = {
  collection: string
  documentId: string
  payload: {
    checkedAt: string
    emulatorHost?: string
    message: string
    projectId: string
    runtime: 'backend-container'
  }
}

export type ValidationService = {
  writeAndReadValidation: (
    emulatorHost: string | undefined,
  ) => Promise<FirestoreValidationResponse>
}

export function createBackendApp(
  validationService: ValidationService,
  options: { firestoreEmulatorHost?: string; projectId: string },
) {
  const app = express()

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      projectId: options.projectId,
      firestoreEmulatorHost: options.firestoreEmulatorHost ?? null,
    })
  })

  app.post('/api/firestore/validation', async (_request, response) => {
    try {
      const result = await validationService.writeAndReadValidation(options.firestoreEmulatorHost)

      response.json({
        ok: true,
        ...result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error'

      response.status(500).json({
        ok: false,
        error: message,
      })
    }
  })

  return app
}
