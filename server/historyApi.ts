import express from 'express'
import type { Request, Response } from 'express'
import type { EditorLanguage } from '../src/features/editor/languages'
import type { AppendHistoryRequest } from '../src/features/history/apiTypes'
import { HistoryStorage } from './historyStorage'

const supportedLanguages = new Set<EditorLanguage>(['python', 'javascript', 'java'])

function isAppendHistoryRequest(value: unknown): value is AppendHistoryRequest {
  if (!value || typeof value !== 'object') {
    return false
  }

  const request = value as Partial<AppendHistoryRequest>
  return (
    typeof request.language === 'string'
    && supportedLanguages.has(request.language as EditorLanguage)
    && Array.isArray(request.events)
  )
}

export function createHistoryApi(storage: HistoryStorage) {
  const app = express()

  app.use(express.json())

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  app.post('/api/history/sessions/:sessionId/events', (request, response) => {
    const sessionId = request.params.sessionId

    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      response.status(400).send('Session ID is required')
      return
    }

    if (!isAppendHistoryRequest(request.body)) {
      response.status(400).send('Invalid history append request')
      return
    }

    const hasInvalidSequence = request.body.events.some((event, index, events) => {
      if (typeof event.sequence !== 'number' || typeof event.timestamp !== 'number') {
        return true
      }

      if (!Array.isArray(event.changes)) {
        return true
      }

      const previousSequence = index === 0 ? event.sequence - 1 : events[index - 1]?.sequence
      return event.sequence <= (previousSequence ?? 0)
    })

    if (hasInvalidSequence) {
      response.status(400).send('Events must be ordered by increasing sequence')
      return
    }

    const totalEvents = storage.appendSessionEvents(
      sessionId,
      request.body.language,
      request.body.events,
    )

    response.json({
      sessionId,
      acceptedEvents: request.body.events.length,
      totalEvents,
    })
  })

  app.get('/api/history/sessions/:sessionId', (request: Request, response: Response) => {
    const sessionId = request.params.sessionId

    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      response.status(400).send('Session ID is required')
      return
    }

    const session = storage.getSession(sessionId)

    if (!session) {
      response.status(404).send('Session not found')
      return
    }

    response.json(session)
  })

  return app
}
