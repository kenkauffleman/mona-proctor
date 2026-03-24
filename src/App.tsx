import { useEffect, useRef, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import { EditorPane } from './components/EditorPane'
import { LanguageSelector } from './components/LanguageSelector'
import {
  editorLanguages,
  emptySourcesByLanguage,
  type EditorLanguage,
} from './features/editor/languages'
import {
  getRecordEditorModelPath,
  getReplayEditorModelPath,
} from './features/editor/modelPaths'
import {
  applyRecordedMonacoEvent,
  buildRecordedMonacoPlaybackSteps,
  createRecordedMonacoEvent,
} from './features/history/history'
import type { RecordedMonacoEvent } from './features/history/types'

export default function App() {
  const [activeLanguage, setActiveLanguage] = useState<EditorLanguage>('python')
  const [sources, setSources] = useState(emptySourcesByLanguage)
  const [recordedEvents, setRecordedEvents] = useState<RecordedMonacoEvent[]>([])
  const [replaySource, setReplaySource] = useState(emptySourcesByLanguage.python)
  const [isWatchingReplay, setIsWatchingReplay] = useState(false)
  const nextSequenceRef = useRef(1)
  const isApplyingReplayRef = useRef(false)
  const replayTimeoutIdsRef = useRef<number[]>([])

  const handleSourceChange = (nextSource: string) => {
    setSources((current) => ({
      ...current,
      [activeLanguage]: nextSource,
    }))
  }

  const clearReplayTimers = () => {
    for (const timeoutId of replayTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }

    replayTimeoutIdsRef.current = []
    setIsWatchingReplay(false)
  }

  useEffect(() => {
    clearReplayTimers()
    setRecordedEvents([])
    nextSequenceRef.current = 1
    setReplaySource(emptySourcesByLanguage[activeLanguage])
  }, [activeLanguage])

  useEffect(() => clearReplayTimers, [])

  const handleRecordEditorMount: OnMount = (editorInstance) => {
    const model = editorInstance.getModel()

    if (!model) {
      return
    }

    model.onDidChangeContent((event) => {
      if (isApplyingReplayRef.current) {
        return
      }

      setRecordedEvents((current) => [
        ...current,
        createRecordedMonacoEvent(
          event,
          nextSequenceRef.current++,
          Date.now(),
        ),
      ])
    })
  }

  const handleResetReplay = () => {
    clearReplayTimers()
    setReplaySource(emptySourcesByLanguage[activeLanguage])
  }

  const handleWatchReplay = () => {
    clearReplayTimers()
    setReplaySource(emptySourcesByLanguage[activeLanguage])

    if (recordedEvents.length === 0) {
      return
    }

    setIsWatchingReplay(true)

    const playbackSteps = buildRecordedMonacoPlaybackSteps(recordedEvents)

    playbackSteps.forEach((step) => {
      const timeoutId = window.setTimeout(() => {
        isApplyingReplayRef.current = true
        setReplaySource((current) => applyRecordedMonacoEvent(current, step.event))
        isApplyingReplayRef.current = false

        if (step === playbackSteps[playbackSteps.length - 1]) {
          setIsWatchingReplay(false)
          replayTimeoutIdsRef.current = []
        }
      }, step.elapsedMs)

      replayTimeoutIdsRef.current.push(timeoutId)
    })
  }

  const activeLanguageConfig = editorLanguages[activeLanguage]
  const recordModelPath = getRecordEditorModelPath(activeLanguageConfig)
  const replayModelPath = getReplayEditorModelPath(activeLanguageConfig)

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 2</p>
        <h1>In-Memory Monaco History Prototype</h1>
        <p className="hero-copy">
          Record Monaco content-change events from one editor, inspect the
          in-memory history, and reconstruct the final document in a separate
          replay editor.
        </p>
      </section>

      <section className="workspace" aria-label="Editor workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Wave 2 Demo</h2>
            <p>Capture editor operations in memory and replay them deterministically.</p>
          </div>
          <LanguageSelector
            languages={editorLanguages}
            selectedLanguage={activeLanguage}
            onSelectLanguage={setActiveLanguage}
          />
        </div>

        <div className="workspace-meta" aria-label="Current editor details">
          <span>{activeLanguageConfig.label}</span>
          <span>{activeLanguageConfig.monacoLanguage}</span>
          <span>{recordedEvents.length} recorded events</span>
          <span>{isWatchingReplay ? 'Replay running' : 'Replay idle'}</span>
        </div>

        <div className="editor-grid">
          <section className="editor-column" aria-label="Record editor panel">
            <div className="panel-heading">
              <div>
                <h3>Record Editor</h3>
                <p>Start from an empty document and record Monaco content-change events as the canonical history stream.</p>
              </div>
            </div>
            <EditorPane
              language={activeLanguageConfig}
              modelPath={recordModelPath}
              source={sources[activeLanguage]}
              onSourceChange={handleSourceChange}
              onMount={handleRecordEditorMount}
              ariaLabel="Record editor"
            />
          </section>

          <section className="editor-column" aria-label="Replay editor panel">
            <div className="panel-heading">
              <div>
                <h3>Replay Editor</h3>
                <p>Replay stays idle while you type, then rebuilds the document from empty using the original event timing.</p>
              </div>
              <div className="replay-controls">
                <button type="button" onClick={handleResetReplay}>
                  Reset Replay
                </button>
                <button
                  type="button"
                  onClick={handleWatchReplay}
                  disabled={isWatchingReplay || recordedEvents.length === 0}
                >
                  Watch Replay
                </button>
              </div>
            </div>
            <EditorPane
              language={activeLanguageConfig}
              modelPath={replayModelPath}
              source={replaySource}
              readOnly
              height="65vh"
              ariaLabel="Replay editor"
            />
          </section>
        </div>

        <section className="debug-panel" aria-label="Recorded event log">
          <div className="panel-heading">
            <div>
              <h3>Event Log</h3>
              <p>Each entry stores sequence, timestamp, versioning, undo/redo flags, and Monaco change payload data.</p>
            </div>
          </div>
          <div className="debug-summary">
            <span>Current source length: {sources[activeLanguage].length}</span>
            <span>Replay source length: {replaySource.length}</span>
            <span>
              Replay duration:{' '}
              {recordedEvents.length < 2
                ? '0ms'
                : `${recordedEvents[recordedEvents.length - 1]!.timestamp - recordedEvents[0]!.timestamp}ms`}
            </span>
          </div>
          <pre className="event-log">
            {recordedEvents.length === 0
              ? 'No events recorded yet. Start typing in the record editor.'
              : JSON.stringify(recordedEvents, null, 2)}
          </pre>
        </section>
      </section>
    </main>
  )
}
