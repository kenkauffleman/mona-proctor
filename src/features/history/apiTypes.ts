import type { EditorLanguage } from '../editor/languages'
import type { RecordedMonacoEvent } from './types'

export type AppendHistoryRequest = {
  language: EditorLanguage
  events: RecordedMonacoEvent[]
}

export type AppendHistoryResponse = {
  sessionId: string
  acceptedEvents: number
  totalEvents: number
}

export type HistorySessionResponse = {
  sessionId: string
  language: EditorLanguage
  events: RecordedMonacoEvent[]
}
