import type { EditorLanguage } from '../src/features/editor/languages.js'
import type { RecordedMonacoEvent } from '../src/features/history/types.js'

export type HistoryBatchRecord = {
  batchSequence: number
  eventOffset: number
  eventCount: number
  uploadedAt: string
}

export type AppendHistoryBatchInput = {
  language: EditorLanguage
  batchSequence: number
  eventOffset: number
  events: RecordedMonacoEvent[]
}

export type AppendHistoryBatchResult = {
  sessionId: string
  batchSequence: number
  acceptedEvents: number
  totalEvents: number
  totalBatches: number
}

export type HistorySessionRecord = {
  sessionId: string
  language: EditorLanguage
  events: RecordedMonacoEvent[]
  batches: HistoryBatchRecord[]
}

export interface HistoryRepository {
  appendHistoryBatch(sessionId: string, batch: AppendHistoryBatchInput): Promise<AppendHistoryBatchResult>
  loadSessionHistory(sessionId: string): Promise<HistorySessionRecord | null>
}
