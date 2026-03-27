import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorPane } from '../../components/EditorPane'
import { editorLanguages } from '../editor/languages'
import { getReplayEditorModelPath } from '../editor/modelPaths'
import { fetchSessionHistory } from './client'
import {
  applyRecordedMonacoEvent,
  buildRecordedMonacoPlaybackSteps,
  replayRecordedMonacoEvents,
} from './history'
import type { RecordedMonacoEvent } from './types'

function getInitialSessionId() {
  return new URLSearchParams(window.location.search).get('sessionId') ?? ''
}

export function ReplayPage() {
  const [sessionIdInput, setSessionIdInput] = useState(getInitialSessionId)
  const [loadedSessionId, setLoadedSessionId] = useState('')
  const [activeLanguage, setActiveLanguage] = useState<'python' | 'javascript' | 'java'>('python')
  const [events, setEvents] = useState<RecordedMonacoEvent[]>([])
  const [batchCount, setBatchCount] = useState(0)
  const [replaySource, setReplaySource] = useState('')
  const [status, setStatus] = useState('Enter a session UUID to load history.')
  const [isLoading, setIsLoading] = useState(false)
  const [isWatchingReplay, setIsWatchingReplay] = useState(false)
  const timeoutIdsRef = useRef<number[]>([])

  const activeLanguageConfig = editorLanguages[activeLanguage]
  const playbackSteps = useMemo(
    () => buildRecordedMonacoPlaybackSteps(events),
    [events],
  )

  useEffect(() => {
    return () => {
      for (const timeoutId of timeoutIdsRef.current) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  const clearReplayTimers = () => {
    for (const timeoutId of timeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }

    timeoutIdsRef.current = []
    setIsWatchingReplay(false)
  }

  const handleLoadSession = async () => {
    setIsLoading(true)
    clearReplayTimers()

    try {
      const session = await fetchSessionHistory(sessionIdInput.trim())
      setLoadedSessionId(session.sessionId)
      setActiveLanguage(session.language)
      setEvents(session.events)
      setBatchCount(session.batches.length)
      setReplaySource(replayRecordedMonacoEvents('', session.events))
      setStatus(
        session.events.length === 0
          ? 'Session loaded with no events.'
          : `Loaded ${session.events.length} events and reconstructed the final source.`,
      )
    } catch (error) {
      setEvents([])
      setBatchCount(0)
      setReplaySource('')
      setStatus(error instanceof Error ? error.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWatchReplay = () => {
    clearReplayTimers()
    setReplaySource('')

    if (playbackSteps.length === 0) {
      return
    }

    setIsWatchingReplay(true)

    playbackSteps.forEach((step, index) => {
      const timeoutId = window.setTimeout(() => {
        setReplaySource((current) => applyRecordedMonacoEvent(current, step.event))

        if (index === playbackSteps.length - 1) {
          setIsWatchingReplay(false)
          timeoutIdsRef.current = []
        }
      }, step.elapsedMs)

      timeoutIdsRef.current.push(timeoutId)
    })
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 10</p>
        <h1>Session Replay</h1>
        <p className="hero-copy">
          Load one of your authenticated sessions by UUID, fetch the full backend history from Firestore, and replay it into a separate Monaco editor.
        </p>
      </section>

      <section className="workspace" aria-label="Replay workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Replay Page</h2>
            <p>The backend response alone is enough to reconstruct the final editor contents.</p>
          </div>
          <div className="replay-form">
            <label className="language-selector" htmlFor="session-id-input">
              <span>Session UUID</span>
              <input
                id="session-id-input"
                name="session-id-input"
                value={sessionIdInput}
                onChange={(event) => setSessionIdInput(event.target.value)}
                placeholder="Enter session UUID"
              />
            </label>
            <div className="replay-controls">
              <a className="button-link" href="/">
                Back to Record
              </a>
              <button type="button" onClick={handleLoadSession} disabled={isLoading || sessionIdInput.trim() === ''}>
                {isLoading ? 'Loading...' : 'Load History'}
              </button>
            </div>
          </div>
        </div>

        <div className="workspace-meta" aria-label="Replay session details">
          <span>Loaded session: {loadedSessionId || 'None'}</span>
          <span>Language: {activeLanguageConfig.label}</span>
          <span>{batchCount} uploaded batches</span>
          <span>{events.length} loaded events</span>
          <span>{isWatchingReplay ? 'Replay running' : 'Replay idle'}</span>
          <span>{status}</span>
        </div>

        <div className="editor-grid single-column">
          <section className="editor-column" aria-label="Replay editor panel">
            <div className="panel-heading">
              <div>
                <h3>Replay Editor</h3>
                <p>Load reconstructs the final state immediately. Watch Replay rebuilds from empty using the original timing gaps.</p>
              </div>
              <div className="replay-controls">
                <button type="button" onClick={() => setReplaySource(replayRecordedMonacoEvents('', events))} disabled={events.length === 0}>
                  Show Final State
                </button>
                <button type="button" onClick={handleWatchReplay} disabled={isWatchingReplay || events.length === 0}>
                  Watch Replay
                </button>
              </div>
            </div>
            <EditorPane
              language={activeLanguageConfig}
              modelPath={getReplayEditorModelPath(activeLanguageConfig)}
              source={replaySource}
              readOnly
              ariaLabel="Replay editor"
            />
          </section>
        </div>

        <section className="debug-panel" aria-label="Replay event log">
          <div className="panel-heading">
            <div>
              <h3>Loaded History</h3>
              <p>Ordered backend events are displayed here for debugging and API verification.</p>
            </div>
          </div>
          <pre className="event-log">
            {events.length === 0
              ? 'No backend history loaded yet.'
              : JSON.stringify(events, null, 2)}
          </pre>
        </section>
      </section>
    </main>
  )
}
