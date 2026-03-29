import { useEffect, useRef, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import type { ExecutionLanguage, ExecutionRecord } from '../../../backend/executionTypes'
import { EditorPane } from '../../components/EditorPane'
import { LanguageSelector } from '../../components/LanguageSelector'
import {
  emptySourcesByLanguage,
  editorLanguages,
  type EditorLanguage,
} from '../editor/languages'
import {
  createExecutionJob,
  fetchExecutionJob,
  fetchLatestExecutionJob,
} from '../execution/client'
import { currentPhaseLabel } from '../../config/currentPhase'
import { getRecordEditorModelPath } from '../editor/modelPaths'
import { HistoryBatcher, type HistoryBatcherState } from './batching'
import { appendSessionHistoryBatch } from './client'
import { createRecordedMonacoEvent } from './history'
import { createSessionId } from './session'
import type { RecordedMonacoEvent } from './types'

const syncIntervalMs = 2000
const executionPollIntervalMs = 1000
const runnableLanguages: ExecutionLanguage[] = ['python', 'java']

function isExecutionLanguage(language: EditorLanguage): language is ExecutionLanguage {
  return runnableLanguages.includes(language as ExecutionLanguage)
}

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

function isExecutionTerminal(job: ExecutionRecord | null) {
  return !job || !!job.result
}

function formatExecutionStatus(job: ExecutionRecord | null, isLoadingLatestJob: boolean) {
  if (isLoadingLatestJob) {
    return 'Loading latest execution'
  }

  if (!job) {
    return 'No execution submitted yet'
  }

  if (job.result?.status === 'succeeded') {
    return 'Execution succeeded'
  }

  if (job.result?.status === 'failed') {
    return 'Execution failed'
  }

  if (job.result?.status === 'timed_out') {
    return 'Execution timed out'
  }

  if (job.result?.status === 'error') {
    return 'Execution errored'
  }

  if (job.status === 'running') {
    return 'Execution running'
  }

  return 'Execution queued'
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return 'n/a'
  }

  return `${durationMs}ms`
}

function formatExitCode(exitCode: number | null) {
  if (exitCode === null) {
    return 'n/a'
  }

  return String(exitCode)
}

export function RecordingPage() {
  const [activeLanguage, setActiveLanguage] = useState<EditorLanguage>('python')
  const [sessionId, setSessionId] = useState(createSessionId)
  const [source, setSource] = useState(emptySourcesByLanguage.python)
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
  const [latestExecutionJob, setLatestExecutionJob] = useState<ExecutionRecord | null>(null)
  const [isLoadingLatestExecutionJob, setIsLoadingLatestExecutionJob] = useState(true)
  const [executionError, setExecutionError] = useState<string | null>(null)
  const [isSubmittingExecution, setIsSubmittingExecution] = useState(false)
  const executionLanguage = isExecutionLanguage(activeLanguage) ? activeLanguage : null

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

  useEffect(() => {
    let isCancelled = false

    const loadLatestExecutionJob = async () => {
      if (!executionLanguage) {
        setLatestExecutionJob(null)
        setExecutionError(null)
        setIsLoadingLatestExecutionJob(false)
        return
      }

      setIsLoadingLatestExecutionJob(true)

      try {
        const response = await fetchLatestExecutionJob(executionLanguage)

        if (isCancelled) {
          return
        }

        setLatestExecutionJob(response.job)
        setExecutionError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setExecutionError(error instanceof Error ? error.message : 'Failed to load the latest execution result.')
      } finally {
        if (!isCancelled) {
          setIsLoadingLatestExecutionJob(false)
        }
      }
    }

    void loadLatestExecutionJob()

    return () => {
      isCancelled = true
    }
  }, [executionLanguage])

  useEffect(() => {
    if (!latestExecutionJob || isExecutionTerminal(latestExecutionJob)) {
      return
    }

    const jobId = latestExecutionJob.jobId
    let isCancelled = false

    const pollLatestExecutionJob = async () => {
      try {
        const response = await fetchExecutionJob(jobId)

        if (isCancelled) {
          return
        }

        setLatestExecutionJob(response.job)
        setExecutionError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setExecutionError(error instanceof Error ? error.message : 'Failed to refresh the latest execution result.')
      }
    }

    const timeoutId = window.setTimeout(() => {
      void pollLatestExecutionJob()
    }, executionPollIntervalMs)

    return () => {
      isCancelled = true

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [latestExecutionJob])

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
    setSource(emptySourcesByLanguage[activeLanguage])
    setRecordedEvents([])
    setSyncedEventCount(0)
    nextSequenceRef.current = 1
  }

  const handleRunPython = async () => {
    if (!executionLanguage) {
      return
    }

    setIsSubmittingExecution(true)

    try {
      const response = await createExecutionJob({
        language: executionLanguage,
        source,
      })
      setLatestExecutionJob(response.job)
      setExecutionError(null)
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'Execution submit failed.')
    } finally {
      setIsSubmittingExecution(false)
    }
  }

  const activeLanguageConfig = editorLanguages[activeLanguage]
  const latestExecutionResult = latestExecutionJob?.result ?? null
  const canRunCode = !!executionLanguage
  const executionLabel = executionLanguage ? editorLanguages[executionLanguage].label : 'Code'

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">{currentPhaseLabel}</p>
        <h1>Authenticated code execution</h1>
        <p className="hero-copy">
          Record Monaco content-change events, run Python or Java through the authenticated backend flow,
          and display the latest stored execution result directly in the app.
        </p>
      </section>

      <section className="workspace" aria-label="Recording workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Recording Page</h2>
            <p>Each page session keeps the authenticated history upload path while showing the latest stored execution result for the selected runnable language.</p>
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
                <p>Monaco content-change events remain the canonical history source for this session.</p>
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

        <section className="debug-panel" aria-label="Execution status">
          <div className="panel-heading">
            <div>
              <h3>{executionLabel} Execution</h3>
              <p>The app shows only the latest execution record stored for the authenticated user for the selected runnable language.</p>
            </div>
            <div className="replay-controls">
              <button
                type="button"
                onClick={() => void handleRunPython()}
                disabled={!canRunCode || isSubmittingExecution}
              >
                {isSubmittingExecution ? 'Submitting...' : `Run ${executionLabel}`}
              </button>
            </div>
          </div>
          <div className="debug-summary">
            <span>{formatExecutionStatus(latestExecutionJob, isLoadingLatestExecutionJob)}</span>
            <span>Latest job: {latestExecutionJob?.jobId ?? 'none'}</span>
            <span>Exit status: {formatExitCode(latestExecutionResult?.exitCode ?? null)}</span>
            <span>Duration: {formatDuration(latestExecutionResult?.durationMs ?? null)}</span>
            <span>Truncated: {latestExecutionResult?.truncated ? 'yes' : 'no'}</span>
          </div>
          {!canRunCode ? (
            <p className="panel-note">Execution is available only when the Python or Java editor is selected in this wave.</p>
          ) : null}
          {executionError ? <p className="auth-error panel-note">{executionError}</p> : null}
          <div className="execution-results-grid">
            <section className="execution-result-panel" aria-label="Execution stdout">
              <div className="panel-heading">
                <div>
                  <h3>stdout</h3>
                </div>
              </div>
              <pre className="event-log">
                {latestExecutionResult?.stdout || 'No stdout captured for the latest execution.'}
              </pre>
            </section>
            <section className="execution-result-panel" aria-label="Execution stderr">
              <div className="panel-heading">
                <div>
                  <h3>stderr</h3>
                </div>
              </div>
              <pre className="event-log">
                {latestExecutionResult?.stderr || 'No stderr captured for the latest execution.'}
              </pre>
            </section>
          </div>
        </section>

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
