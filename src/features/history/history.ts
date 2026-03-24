import type {
  MonacoContentChangeEvent,
  RecordedMonacoChange,
  RecordedMonacoEvent,
  RecordedMonacoPlaybackStep,
} from './types'

function toRecordedChange(change: RecordedMonacoChange): RecordedMonacoChange
function toRecordedChange(
  change: MonacoContentChangeEvent['changes'][number],
): RecordedMonacoChange
function toRecordedChange(
  change: MonacoContentChangeEvent['changes'][number],
): RecordedMonacoChange {
  return {
    rangeOffset: change.rangeOffset,
    rangeLength: change.rangeLength,
    text: change.text,
    range: {
      startLineNumber: change.range.startLineNumber,
      startColumn: change.range.startColumn,
      endLineNumber: change.range.endLineNumber,
      endColumn: change.range.endColumn,
    },
  }
}

export function createRecordedMonacoEvent(
  event: MonacoContentChangeEvent,
  sequence: number,
  timestamp: number,
): RecordedMonacoEvent {
  return {
    sequence,
    timestamp,
    versionId: event.versionId,
    isUndoing: event.isUndoing,
    isRedoing: event.isRedoing,
    isFlush: event.isFlush,
    isEolChange: event.isEolChange,
    eol: event.eol,
    changes: event.changes.map(toRecordedChange),
  }
}

function applyRecordedChange(source: string, change: RecordedMonacoChange) {
  const start = source.slice(0, change.rangeOffset)
  const end = source.slice(change.rangeOffset + change.rangeLength)

  return `${start}${change.text}${end}`
}

function normalizeEol(source: string, eol: string) {
  return source.replace(/\r\n|\r|\n/g, eol)
}

export function applyRecordedMonacoEvent(
  source: string,
  event: RecordedMonacoEvent,
) {
  const nextSource = event.changes.reduce(applyRecordedChange, source)

  if (event.isEolChange) {
    return normalizeEol(nextSource, event.eol)
  }

  return nextSource
}

export function replayRecordedMonacoEvents(
  initialSource: string,
  events: RecordedMonacoEvent[],
) {
  return events
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .reduce(applyRecordedMonacoEvent, initialSource)
}

export function buildRecordedMonacoPlaybackSteps(
  events: RecordedMonacoEvent[],
): RecordedMonacoPlaybackStep[] {
  const orderedEvents = events
    .slice()
    .sort((left, right) => left.sequence - right.sequence)

  return orderedEvents.map((event, index) => {
    const previousTimestamp =
      index === 0 ? event.timestamp : orderedEvents[index - 1]?.timestamp ?? event.timestamp
    const firstTimestamp = orderedEvents[0]?.timestamp ?? event.timestamp

    return {
      event,
      delayMs: Math.max(0, event.timestamp - previousTimestamp),
      elapsedMs: Math.max(0, event.timestamp - firstTimestamp),
    }
  })
}
