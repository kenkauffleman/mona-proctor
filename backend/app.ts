import express from 'express'
import type { EditorLanguage } from '../src/features/editor/languages.js'
import type { AppendHistoryBatchRequest } from '../src/features/history/apiTypes.js'
import type { AuthVerifier } from './auth.js'
import { AuthorizationError } from './errors.js'
import type { HistoryRepository } from './historyRepository.js'

const supportedLanguages = new Set<EditorLanguage>(['python', 'javascript', 'java'])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAppendHistoryBatchRequest(value: unknown): value is AppendHistoryBatchRequest {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.language === 'string'
    && supportedLanguages.has(value.language as EditorLanguage)
    && typeof value.batchSequence === 'number'
    && Number.isInteger(value.batchSequence)
    && value.batchSequence >= 1
    && typeof value.eventOffset === 'number'
    && Number.isInteger(value.eventOffset)
    && value.eventOffset >= 0
    && Array.isArray(value.events)
  )
}

function validateBatchOrdering(request: AppendHistoryBatchRequest) {
  let expectedSequence = request.eventOffset + 1

  for (const event of request.events) {
    if (
      typeof event.sequence !== 'number'
      || !Number.isInteger(event.sequence)
      || typeof event.timestamp !== 'number'
      || !Array.isArray(event.changes)
    ) {
      return 'Events must include numeric sequence and timestamp fields plus a changes array.'
    }

    if (event.sequence !== expectedSequence) {
      return 'Batch events must be contiguous and match the provided eventOffset.'
    }

    expectedSequence += 1
  }

  return null
}

export function createBackendApp(
  historyRepository: HistoryRepository,
  authVerifier: AuthVerifier,
  options: {
    cloudRunConfiguration?: string
    cloudRunRevision?: string
    cloudRunService?: string
    firebaseAuthEmulatorHost?: string
    firestoreEmulatorHost?: string
    projectId: string
  },
) {
  const app = express()
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      cloudRunConfiguration: options.cloudRunConfiguration ?? null,
      cloudRunRevision: options.cloudRunRevision ?? null,
      cloudRunService: options.cloudRunService ?? null,
      firebaseAuthEmulatorHost: options.firebaseAuthEmulatorHost ?? null,
      projectId: options.projectId,
      firestoreEmulatorHost: options.firestoreEmulatorHost ?? null,
    })
  })

  app.use('/api/history', async (request, response, next) => {
    const authorizationHeader = request.header('authorization')

    if (!authorizationHeader?.startsWith('Bearer ')) {
      response.status(401).json({
        ok: false,
        error: 'Missing Bearer token.',
      })
      return
    }

    const idToken = authorizationHeader.slice('Bearer '.length).trim()

    if (idToken.length === 0) {
      response.status(401).json({
        ok: false,
        error: 'Missing Bearer token.',
      })
      return
    }

    try {
      response.locals.authenticatedUser = await authVerifier.verifyIdToken(idToken)
      next()
    } catch {
      response.status(401).json({
        ok: false,
        error: 'Invalid Firebase ID token.',
      })
    }
  })

  app.post('/api/history/sessions/:sessionId/batches', async (request, response) => {
    const sessionId = request.params.sessionId

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      response.status(400).send('Session ID is required.')
      return
    }

    if (!isAppendHistoryBatchRequest(request.body)) {
      response.status(400).send('Invalid history batch request.')
      return
    }

    const orderingError = validateBatchOrdering(request.body)

    if (orderingError) {
      response.status(400).send(orderingError)
      return
    }

    try {
      const result = await historyRepository.appendHistoryBatch(
        sessionId.trim(),
        response.locals.authenticatedUser,
        request.body,
      )
      response.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown history append error.'
      const status = error instanceof AuthorizationError
        ? 403
        : message.includes('different history payload') || message.includes('language cannot change')
          ? 409
          : 500

      response.status(status).json({
        ok: false,
        error: message,
      })
    }
  })

  app.get('/api/history/sessions/:sessionId', async (request, response) => {
    const sessionId = request.params.sessionId

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      response.status(400).send('Session ID is required.')
      return
    }

    try {
      const session = await historyRepository.loadSessionHistory(
        sessionId.trim(),
        response.locals.authenticatedUser,
      )

      if (!session) {
        response.status(404).send('Session not found.')
        return
      }

      response.json(session)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown session load error.'
      response.status(error instanceof AuthorizationError ? 403 : 500).json({
        ok: false,
        error: message,
      })
    }
  })

  return app
}
