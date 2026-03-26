import type { EditorLanguage } from '../editor/languages'
import type { RecordedMonacoEvent } from './types'

export type HistoryBatch = {
  sessionId: string
  language: EditorLanguage
  batchSequence: number
  eventOffset: number
  events: RecordedMonacoEvent[]
}

export type HistoryBatcherState = {
  pendingEvents: number
  isFlushing: boolean
  lastError: string | null
  lastSyncedAt: number | null
}

type HistoryBatcherOptions = {
  sessionId: string
  language: EditorLanguage
  intervalMs: number
  sendBatch: (batch: HistoryBatch) => Promise<void>
  onStateChange?: (state: HistoryBatcherState) => void
}

export class HistoryBatcher {
  private readonly sessionId: string
  private readonly language: EditorLanguage
  private readonly intervalMs: number
  private readonly sendBatch: (batch: HistoryBatch) => Promise<void>
  private readonly onStateChange?: (state: HistoryBatcherState) => void
  private pendingEvents: RecordedMonacoEvent[] = []
  private nextBatchSequence = 1
  private intervalId: ReturnType<typeof setInterval> | null = null
  private flushPromise: Promise<void> | null = null
  private state: HistoryBatcherState = {
    pendingEvents: 0,
    isFlushing: false,
    lastError: null,
    lastSyncedAt: null,
  }

  constructor(options: HistoryBatcherOptions) {
    this.sessionId = options.sessionId
    this.language = options.language
    this.intervalMs = options.intervalMs
    this.sendBatch = options.sendBatch
    this.onStateChange = options.onStateChange
    this.publishState()
  }

  enqueue(event: RecordedMonacoEvent) {
    this.pendingEvents.push(event)
    this.ensureInterval()
    this.publishState({
      pendingEvents: this.pendingEvents.length,
      lastError: null,
    })
  }

  async flush() {
    if (this.flushPromise) {
      return this.flushPromise
    }

    if (this.pendingEvents.length === 0) {
      return
    }

    const batchEvents = [...this.pendingEvents]
    const batchSequence = this.nextBatchSequence
    const eventOffset = batchEvents[0]?.sequence ? batchEvents[0].sequence - 1 : 0
    this.pendingEvents = []
    this.publishState({
      pendingEvents: 0,
      isFlushing: true,
      lastError: null,
    })

    this.flushPromise = this.sendBatch({
      sessionId: this.sessionId,
      language: this.language,
      batchSequence,
      eventOffset,
      events: batchEvents,
    })
      .then(() => {
        this.nextBatchSequence += 1
        this.publishState({
          isFlushing: false,
          lastSyncedAt: Date.now(),
        })
      })
      .catch((error: unknown) => {
        this.pendingEvents = [...batchEvents, ...this.pendingEvents]
        this.publishState({
          pendingEvents: this.pendingEvents.length,
          isFlushing: false,
          lastError: error instanceof Error ? error.message : 'Upload failed',
        })
        throw error
      })
      .finally(() => {
        this.flushPromise = null
      })

    return this.flushPromise
  }

  async dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    await this.flush()
  }

  private ensureInterval() {
    if (this.intervalId) {
      return
    }

    this.intervalId = setInterval(() => {
      void this.flush().catch(() => undefined)
    }, this.intervalMs)
  }

  private publishState(patch?: Partial<HistoryBatcherState>) {
    this.state = {
      ...this.state,
      ...patch,
    }
    this.onStateChange?.(this.state)
  }
}
