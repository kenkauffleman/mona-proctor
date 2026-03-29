import express from 'express'
import type { EditorLanguage } from '../src/features/editor/languages.js'
import type { AppendHistoryBatchRequest } from '../src/features/history/apiTypes.js'
import type { AuthVerifier } from './auth.js'
import { AuthorizationError } from './errors.js'
import { executionErrorStatusCode, ExecutionService } from './executionService.js'
import type { CreateExecutionJobRequest } from './executionApiTypes.js'
import type { CreateJavaGradingJobRequest } from './javaGradingApiTypes.js'
import { JavaGradingService } from './javaGradingService.js'
import { executionLanguages, type ExecutionLanguage } from './executionTypes.js'
import type { HistoryRepository } from './historyRepository.js'

const supportedLanguages = new Set<EditorLanguage>(['python', 'javascript', 'java'])
const supportedExecutionLanguages = new Set<ExecutionLanguage>(executionLanguages)

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

function isCreateExecutionJobRequest(value: unknown): value is CreateExecutionJobRequest {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.language === 'string'
    && supportedExecutionLanguages.has(value.language as ExecutionLanguage)
    && typeof value.source === 'string'
  )
}

function isCreateJavaGradingJobRequest(value: unknown): value is CreateJavaGradingJobRequest {
  if (!isObject(value)) {
    return false
  }

  return typeof value.problemId === 'string' && typeof value.source === 'string'
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
  executionService: ExecutionService,
  javaGradingService: JavaGradingService,
  options: {
    allowedOrigins?: string[]
    cloudRunConfiguration?: string
    cloudRunRevision?: string
    cloudRunService?: string
    executionBackend?: string
    executionCloudRunJavaJobName?: string
    executionCloudRunPythonJobName?: string
    executionCloudRunProjectId?: string
    executionCloudRunRegion?: string
    executionGlobalActiveJobLimit?: number
    executionMaxSourceBytes?: number
    executionMaxStderrBytes?: number
    executionMaxStdoutBytes?: number
    executionTimeoutMs?: number
    javaExecutionMaxMemoryMb?: number
    javaExecutionMaxSourceBytes?: number
    javaExecutionMaxStderrBytes?: number
    javaExecutionMaxStdoutBytes?: number
    javaExecutionTimeoutMs?: number
    firebaseAuthEmulatorHost?: string
    firestoreEmulatorHost?: string
    projectId: string
  },
) {
  const app = express()
  app.use(express.json())

  app.use((request, response, next) => {
    const requestOrigin = request.header('origin')
    const allowedOrigin = requestOrigin && options.allowedOrigins?.includes(requestOrigin)
      ? requestOrigin
      : null

    if (allowedOrigin) {
      response.header('Access-Control-Allow-Origin', allowedOrigin)
      response.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      response.header('Access-Control-Allow-Credentials', 'true')
      response.header('Vary', 'Origin')
    }

    if (request.method === 'OPTIONS') {
      if (allowedOrigin) {
        response.status(204).end()
        return
      }

      response.status(403).json({
        ok: false,
        error: 'Origin not allowed.',
      })
      return
    }

    next()
  })

  app.get('/health', (_request, response) => {
    response.json({
      allowedOrigins: options.allowedOrigins ?? [],
      ok: true,
      cloudRunConfiguration: options.cloudRunConfiguration ?? null,
      cloudRunRevision: options.cloudRunRevision ?? null,
      cloudRunService: options.cloudRunService ?? null,
      executionBackend: options.executionBackend ?? null,
      executionCloudRunJavaJobName: options.executionCloudRunJavaJobName ?? null,
      executionCloudRunPythonJobName: options.executionCloudRunPythonJobName ?? null,
      executionCloudRunProjectId: options.executionCloudRunProjectId ?? null,
      executionCloudRunRegion: options.executionCloudRunRegion ?? null,
      executionGlobalActiveJobLimit: options.executionGlobalActiveJobLimit ?? null,
      executionMaxSourceBytes: options.executionMaxSourceBytes ?? null,
      executionMaxStderrBytes: options.executionMaxStderrBytes ?? null,
      executionMaxStdoutBytes: options.executionMaxStdoutBytes ?? null,
      executionTimeoutMs: options.executionTimeoutMs ?? null,
      javaExecutionMaxMemoryMb: options.javaExecutionMaxMemoryMb ?? null,
      javaExecutionMaxSourceBytes: options.javaExecutionMaxSourceBytes ?? null,
      javaExecutionMaxStderrBytes: options.javaExecutionMaxStderrBytes ?? null,
      javaExecutionMaxStdoutBytes: options.javaExecutionMaxStdoutBytes ?? null,
      javaExecutionTimeoutMs: options.javaExecutionTimeoutMs ?? null,
      firebaseAuthEmulatorHost: options.firebaseAuthEmulatorHost ?? null,
      projectId: options.projectId,
      firestoreEmulatorHost: options.firestoreEmulatorHost ?? null,
    })
  })

  app.use(['/api/history', '/api/execution', '/api/java-grading'], async (request, response, next) => {
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

  app.post('/api/execution/jobs', async (request, response) => {
    if (!isCreateExecutionJobRequest(request.body)) {
      response.status(400).json({
        ok: false,
        error: 'Invalid execution job request.',
      })
      return
    }

    try {
      const job = await executionService.submitExecution(
        response.locals.authenticatedUser,
        request.body,
      )
      response.status(202).json({ job })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown execution submission error.'
      response.status(executionErrorStatusCode(error)).json({
        ok: false,
        error: message,
      })
    }
  })

  app.get('/api/execution/jobs/:jobId', async (request, response) => {
    const jobId = request.params.jobId

    if (typeof jobId !== 'string' || jobId.trim().length === 0) {
      response.status(400).json({
        ok: false,
        error: 'Execution job ID is required.',
      })
      return
    }

    try {
      const job = await executionService.getExecutionJob(
        jobId.trim(),
        response.locals.authenticatedUser,
      )

      if (!job) {
        response.status(404).json({
          ok: false,
          error: 'Execution job not found.',
        })
        return
      }

      response.json({ job })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown execution load error.'
      response.status(error instanceof AuthorizationError ? 403 : 500).json({
        ok: false,
        error: message,
      })
    }
  })

  app.post('/api/java-grading/jobs', async (request, response) => {
    if (!isCreateJavaGradingJobRequest(request.body)) {
      response.status(400).json({
        ok: false,
        error: 'Invalid Java grading job request.',
      })
      return
    }

    try {
      const job = await javaGradingService.submitJavaGrading(
        response.locals.authenticatedUser,
        request.body,
      )
      response.status(202).json({ job })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Java grading submission error.'
      response.status(executionErrorStatusCode(error)).json({
        ok: false,
        error: message,
      })
    }
  })

  app.get('/api/java-grading/jobs/:gradingJobId', async (request, response) => {
    const gradingJobId = request.params.gradingJobId

    if (typeof gradingJobId !== 'string' || gradingJobId.trim().length === 0) {
      response.status(400).json({
        ok: false,
        error: 'Java grading job ID is required.',
      })
      return
    }

    try {
      const job = await javaGradingService.getJavaGradingJob(
        gradingJobId.trim(),
        response.locals.authenticatedUser,
      )

      if (!job) {
        response.status(404).json({
          ok: false,
          error: 'Java grading job not found.',
        })
        return
      }

      response.json({ job })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Java grading load error.'
      response.status(error instanceof AuthorizationError ? 403 : 500).json({
        ok: false,
        error: message,
      })
    }
  })

  return app
}
