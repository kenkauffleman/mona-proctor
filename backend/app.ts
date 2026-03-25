import express from 'express'

export type FirestoreValidationRequest = {
  note?: string
  runId?: string
}

export type FirestoreValidationResponse = {
  collection: string
  documentId: string
  payload: {
    checkedAt: string
    emulatorHost?: string
    note?: string
    projectId: string
    runId: string
    runtime: 'backend-api'
  }
}

export type ValidationService = {
  writeAndReadValidation: (
    request: FirestoreValidationRequest,
    emulatorHost: string | undefined,
  ) => Promise<FirestoreValidationResponse>
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseValidationRequest(body: unknown): FirestoreValidationRequest {
  if (body === undefined) {
    return {}
  }

  if (!isObject(body)) {
    throw new Error('Request body must be a JSON object.')
  }

  const request: FirestoreValidationRequest = {}

  if ('runId' in body) {
    if (typeof body.runId !== 'string' || body.runId.trim().length === 0) {
      throw new Error('runId must be a non-empty string when provided.')
    }

    request.runId = body.runId.trim()
  }

  if ('note' in body) {
    if (typeof body.note !== 'string' || body.note.trim().length === 0) {
      throw new Error('note must be a non-empty string when provided.')
    }

    request.note = body.note.trim()
  }

  return request
}

export function createBackendApp(
  validationService: ValidationService,
  options: { firestoreEmulatorHost?: string; projectId: string },
) {
  const app = express()
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      projectId: options.projectId,
      firestoreEmulatorHost: options.firestoreEmulatorHost ?? null,
    })
  })

  app.post('/api/firestore/validation', async (request, response) => {
    try {
      const validationRequest = parseValidationRequest(request.body)
      const result = await validationService.writeAndReadValidation(
        validationRequest,
        options.firestoreEmulatorHost,
      )

      response.json({
        ok: true,
        ...result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error'

      if (message.includes('Request body') || message.includes('runId') || message.includes('note')) {
        response.status(400).json({
          ok: false,
          error: message,
        })
        return
      }

      response.status(500).json({
        ok: false,
        error: message,
      })
    }
  })

  return app
}
