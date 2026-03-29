import { useEffect, useRef, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import type { ExecutionLanguage, ExecutionRecord } from '../../../backend/executionTypes'
import type { JavaGradingRecord } from '../../../backend/javaGradingTypes'
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
} from '../execution/client'
import {
  createJavaGradingJob,
  fetchJavaGradingJob,
} from '../javaGrading/client'
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
const sampleJavaProblemId = 'java-fibonacci'

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

function formatExecutionStatus(job: ExecutionRecord | null) {
  if (!job) {
    return 'No execution submitted in this session yet'
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

function isJavaGradingTerminal(job: JavaGradingRecord | null) {
  return !job || !!job.result
}

function formatJavaGradingStatus(job: JavaGradingRecord | null) {
  if (!job) {
    return 'No Java grading submitted in this session yet'
  }

  if (!job.result) {
    return job.status === 'running' ? 'Java grading running' : 'Java grading queued'
  }

  if (job.result.compileFailed) {
    return 'Java grading compile failure'
  }

  if (job.result.overallStatus === 'passed') {
    return 'Java grading passed'
  }

  if (job.result.overallStatus === 'failed') {
    return 'Java grading failed'
  }

  return 'Java grading errored'
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
  const [latestJavaGradingJob, setLatestJavaGradingJob] = useState<JavaGradingRecord | null>(null)
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
    setLatestExecutionJob(null)
    setLatestJavaGradingJob(null)
    setExecutionError(null)
  }, [activeLanguage])

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

        setExecutionError(error instanceof Error ? error.message : 'Failed to refresh the current execution result.')
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

  useEffect(() => {
    if (!latestJavaGradingJob || isJavaGradingTerminal(latestJavaGradingJob)) {
      return
    }

    const gradingJobId = latestJavaGradingJob.gradingJobId
    let isCancelled = false

    const pollLatestJavaGradingJob = async () => {
      try {
        const response = await fetchJavaGradingJob(gradingJobId)

        if (isCancelled) {
          return
        }

        setLatestJavaGradingJob(response.job)
        setExecutionError(null)
      } catch (error) {
        if (isCancelled) {
          return
        }

        setExecutionError(error instanceof Error ? error.message : 'Failed to refresh the current Java grading result.')
      }
    }

    const timeoutId = window.setTimeout(() => {
      void pollLatestJavaGradingJob()
    }, executionPollIntervalMs)

    return () => {
      isCancelled = true

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [latestJavaGradingJob])

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
    setLatestExecutionJob(null)
    setLatestJavaGradingJob(null)
    setExecutionError(null)
  }

  const handleSubmitRunnableAction = async () => {
    if (!executionLanguage) {
      return
    }

    setIsSubmittingExecution(true)

    try {
      if (executionLanguage === 'java') {
        const response = await createJavaGradingJob({
          problemId: sampleJavaProblemId,
          source,
        })
        setLatestJavaGradingJob(response.job)
        setLatestExecutionJob(null)
      } else {
        const response = await createExecutionJob({
          language: executionLanguage,
          source,
        })
        setLatestExecutionJob(response.job)
        setLatestJavaGradingJob(null)
      }
      setExecutionError(null)
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'Execution submit failed.')
    } finally {
      setIsSubmittingExecution(false)
    }
  }

  const activeLanguageConfig = editorLanguages[activeLanguage]
  const latestExecutionResult = latestExecutionJob?.result ?? null
  const latestJavaGradingResult = latestJavaGradingJob?.result ?? null
  const canRunCode = !!executionLanguage
  const actionLabel = executionLanguage === 'java'
    ? 'Grade Java'
    : executionLanguage
      ? `Run ${editorLanguages[executionLanguage].label}`
      : 'Run Code'
  const statusLabel = executionLanguage === 'java'
    ? formatJavaGradingStatus(latestJavaGradingJob)
    : formatExecutionStatus(latestExecutionJob)

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">{currentPhaseLabel}</p>
        <h1>Authenticated code execution</h1>
        <p className="hero-copy">
          Record Monaco content-change events, run Python or Java through the authenticated backend flow,
          and display the current page session execution result directly in the app.
        </p>
      </section>

      <section className="workspace" aria-label="Recording workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Recording Page</h2>
            <p>Each page session keeps the authenticated history upload path while showing only execution results submitted from this page.</p>
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
              <h3>{executionLanguage === 'java' ? 'Java Grading' : 'Execution'}</h3>
              <p>
                {executionLanguage === 'java'
                  ? 'Java uses the backend-owned Fibonacci problem and hidden stdout tests in this wave.'
                  : 'The app shows only the execution result submitted from the current page session.'}
              </p>
            </div>
            <div className="replay-controls">
              <button
                type="button"
                onClick={() => void handleSubmitRunnableAction()}
                disabled={!canRunCode || isSubmittingExecution}
              >
                {isSubmittingExecution ? 'Submitting...' : actionLabel}
              </button>
            </div>
          </div>
          <div className="debug-summary">
            <span>{statusLabel}</span>
            {executionLanguage === 'java' ? (
              <>
                <span>Current grading job: {latestJavaGradingJob?.gradingJobId ?? 'none'}</span>
                <span>Problem: {latestJavaGradingJob?.problemId ?? sampleJavaProblemId}</span>
                <span>
                  Passed tests: {latestJavaGradingResult ? `${latestJavaGradingResult.passedTests}/${latestJavaGradingResult.totalTests}` : 'n/a'}
                </span>
              </>
            ) : (
              <>
                <span>Current job: {latestExecutionJob?.jobId ?? 'none'}</span>
                <span>Exit status: {formatExitCode(latestExecutionResult?.exitCode ?? null)}</span>
                <span>Duration: {formatDuration(latestExecutionResult?.durationMs ?? null)}</span>
                <span>Truncated: {latestExecutionResult?.truncated ? 'yes' : 'no'}</span>
              </>
            )}
          </div>
          {!canRunCode ? (
            <p className="panel-note">Execution is available only when the Python or Java editor is selected in this wave.</p>
          ) : null}
          {executionError ? <p className="auth-error panel-note">{executionError}</p> : null}
          {executionLanguage === 'java' ? (
            <div className="execution-results-grid">
              <section className="execution-result-panel" aria-label="Java grading summary">
                <div className="panel-heading">
                  <div>
                    <h3>Summary</h3>
                  </div>
                </div>
                <pre className="event-log">
                  {latestJavaGradingResult
                    ? latestJavaGradingResult.compileFailed
                      ? latestJavaGradingResult.tests.find((test) => test.stderr)?.stderr ?? latestJavaGradingResult.summary
                      : latestJavaGradingResult.summary
                    : 'No Java grading submitted in this session yet.'}
                </pre>
              </section>
              <section className="execution-result-panel" aria-label="Java grading tests">
                <div className="panel-heading">
                  <div>
                    <h3>Per-test results</h3>
                  </div>
                </div>
                <pre className="event-log">
                  {latestJavaGradingResult
                    ? latestJavaGradingResult.compileFailed
                      ? 'Per-test results are not shown when compilation fails.'
                      : latestJavaGradingResult.tests.map((test) => {
                      const lines = [
                        `${test.testId}: ${test.status}`,
                        `expected stdout:`,
                        `${test.expectedStdout ?? ''}`,
                      ]

                      if (test.actualStdout !== null) {
                        lines.push('actual stdout:')
                        lines.push(test.actualStdout)
                      }

                      if (test.stderr) {
                        lines.push('stderr:')
                        lines.push(test.stderr)
                      }

                      return lines.join('\n')
                    }).join('\n\n')
                    : 'No per-test results yet.'}
                </pre>
              </section>
            </div>
          ) : (
            <div className="execution-results-grid">
              <section className="execution-result-panel" aria-label="Execution stdout">
                <div className="panel-heading">
                  <div>
                    <h3>stdout</h3>
                  </div>
                </div>
                <pre className="event-log">
                  {latestExecutionResult?.stdout || 'No stdout captured for the current execution.'}
                </pre>
              </section>
              <section className="execution-result-panel" aria-label="Execution stderr">
                <div className="panel-heading">
                  <div>
                    <h3>stderr</h3>
                  </div>
                </div>
                <pre className="event-log">
                  {latestExecutionResult?.stderr || 'No stderr captured for the current execution.'}
                </pre>
              </section>
            </div>
          )}
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
