import { useEffect, useRef, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import { EditorPane } from '../../components/EditorPane'
import { LanguageSelector } from '../../components/LanguageSelector'
import {
  editorLanguages,
  emptySourcesByLanguage,
  type EditorLanguage,
} from '../editor/languages'
import { getRecordEditorModelPath } from '../editor/modelPaths'
import { HistoryBatcher, type HistoryBatcherState } from './batching'
import { appendSessionHistoryBatch } from './client'
import { createRecordedMonacoEvent } from './history'
import { createSessionId } from './session'
import type { RecordedMonacoEvent } from './types'

const syncIntervalMs = 2000

function formatSyncLabel(state: HistoryBatcherState) {
  if (state.isFlushing) {
    return 'Syncing'
  }

  if (state.lastError) {
    return 'Sync error'
  }

  if (state.lastSyncedAt) {
    return `Synced at ${new Date(state.lastSyncedAt).toLocaleTimeString()}`
  }

  return 'Waiting for first batch'
}

export function RecordingPage() {
  const [activeLanguage, setActiveLanguage] = useState<EditorLanguage>('python')
  const [sessionId, setSessionId] = useState(createSessionId)
  const [source, setSource] = useState('')
  const [recordedEvents, setRecordedEvents] = useState<RecordedMonacoEvent[]>([])
  const [syncedEventCount, setSyncedEventCount] = useState(0)
  const [batcherState, setBatcherState] = useState<HistoryBatcherState>({
    pendingEvents: 0,
    isFlushing: false,
    lastError: null,
    lastSyncedAt: null,
  })
  const nextSequenceRef = useRef(1)
  const batcherRef = useRef<HistoryBatcher | null>(null)

  useEffect(() => {
    const batcher = new HistoryBatcher({
      sessionId,
      language: activeLanguage,
      intervalMs: syncIntervalMs,
      sendBatch: async (batch) => {
        const response = await appendSessionHistoryBatch(batch.sessionId, {
          language: batch.language,
          batchSequence: batch.batchSequence,
          eventOffset: batch.eventOffset,
          events: batch.events,
        })
        setSyncedEventCount(response.totalEvents)
      },
      onStateChange: setBatcherState,
    })

    batcherRef.current = batcher

    return () => {
      void batcher.dispose()
    }
  }, [activeLanguage, sessionId])

  useEffect(() => {
    setSource(emptySourcesByLanguage[activeLanguage])
    setRecordedEvents([])
    setSyncedEventCount(0)
    setBatcherState({
      pendingEvents: 0,
      isFlushing: false,
      lastError: null,
      lastSyncedAt: null,
    })
    nextSequenceRef.current = 1
    setSessionId(createSessionId())
  }, [activeLanguage])

  const handleRecordEditorMount: OnMount = (editorInstance) => {
    const model = editorInstance.getModel()

    if (!model) {
      return
    }

    model.onDidChangeContent((event) => {
      const recordedEvent = createRecordedMonacoEvent(
        event,
        nextSequenceRef.current++,
        Date.now(),
      )

      setRecordedEvents((current) => [...current, recordedEvent])
      batcherRef.current?.enqueue(recordedEvent)
    })
  }

  const handleStartFreshSession = () => {
    setSessionId(createSessionId())
    setSource('')
    setRecordedEvents([])
    setSyncedEventCount(0)
    nextSequenceRef.current = 1
  }

  const activeLanguageConfig = editorLanguages[activeLanguage]

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 10</p>
        <h1>Local authenticated history recording</h1>
        <p className="hero-copy">
          Record Monaco content-change events, send Firebase-authenticated history batches to the backend,
          and persist per-user session history in Firestore for later replay.
        </p>
      </section>

      <section className="workspace" aria-label="Recording workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Recording Page</h2>
            <p>Each page session gets a client-generated UUID and uploads append-only history batches through the authenticated backend API.</p>
          </div>
          <LanguageSelector
            languages={editorLanguages}
            selectedLanguage={activeLanguage}
            onSelectLanguage={setActiveLanguage}
          />
        </div>

        <div className="workspace-meta" aria-label="Recording session details">
          <span>Session UUID: {sessionId}</span>
          <span>Language: {activeLanguageConfig.label}</span>
          <span>{recordedEvents.length} recorded events</span>
          <span>{syncedEventCount} synced events</span>
          <span>{formatSyncLabel(batcherState)}</span>
        </div>

        <div className="editor-grid single-column">
          <section className="editor-column" aria-label="Record editor panel">
            <div className="panel-heading">
              <div>
                <h3>Record Editor</h3>
                <p>Monaco content-change events are the canonical history source for this session.</p>
              </div>
              <div className="replay-controls">
                <a className="button-link" href={`/replay?sessionId=${sessionId}`}>
                  Open Replay Page
                </a>
                <button type="button" onClick={handleStartFreshSession}>
                  New Session
                </button>
              </div>
            </div>
            <EditorPane
              language={activeLanguageConfig}
              modelPath={getRecordEditorModelPath(activeLanguageConfig)}
              source={source}
              onSourceChange={setSource}
              onMount={handleRecordEditorMount}
              ariaLabel="Record editor"
            />
          </section>
        </div>

        <section className="debug-panel" aria-label="Recording debug status">
          <div className="panel-heading">
            <div>
              <h3>Sync Status</h3>
              <p>The page keeps the UI thin and pushes upload behavior into a reusable batcher.</p>
            </div>
          </div>
          <div className="debug-summary">
            <span>Batch interval: {syncIntervalMs}ms</span>
            <span>Pending events: {batcherState.pendingEvents}</span>
            <span>{batcherState.lastError ?? 'No sync errors'}</span>
          </div>
          <pre className="event-log">
            {recordedEvents.length === 0
              ? 'No events recorded yet. Start typing in the editor.'
              : JSON.stringify(recordedEvents, null, 2)}
          </pre>
        </section>
      </section>
    </main>
  )
}
