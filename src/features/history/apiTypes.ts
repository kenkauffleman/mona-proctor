import type { EditorLanguage } from '../editor/languages.js'
import type { RecordedMonacoEvent } from './types.js'

export type HistoryBatchRecord = {
  batchSequence: number
  eventOffset: number
  eventCount: number
  uploadedAt: string
}

export type AppendHistoryBatchRequest = {
  language: EditorLanguage
  batchSequence: number
  eventOffset: number
  events: RecordedMonacoEvent[]
}

export type AppendHistoryBatchResponse = {
  sessionId: string
  batchSequence: number
  acceptedEvents: number
  totalEvents: number
  totalBatches: number
  ownerUid: string
}

export type AppendHistoryRequest = AppendHistoryBatchRequest
export type AppendHistoryResponse = AppendHistoryBatchResponse

export type HistorySessionResponse = {
  sessionId: string
  language: EditorLanguage
  ownerUid: string
  batches: HistoryBatchRecord[]
  events: RecordedMonacoEvent[]
}
