import type { editor } from 'monaco-editor'

export type MonacoContentChange = editor.IModelContentChange

export type MonacoContentChangeEvent = editor.IModelContentChangedEvent

export type RecordedMonacoChange = {
  rangeOffset: number
  rangeLength: number
  text: string
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
}

export type RecordedMonacoEvent = {
  sequence: number
  timestamp: number
  versionId: number
  isUndoing: boolean
  isRedoing: boolean
  isFlush: boolean
  isEolChange: boolean
  eol: string
  changes: RecordedMonacoChange[]
}

export type RecordedMonacoPlaybackStep = {
  event: RecordedMonacoEvent
  delayMs: number
  elapsedMs: number
}
