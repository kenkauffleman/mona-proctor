import { act, fireEvent, render, screen } from '@testing-library/react'
import { RecordingPage } from './RecordingPage'

const appendSessionHistoryBatch = vi.fn()
const createExecutionJob = vi.fn()
const fetchExecutionJob = vi.fn()
const editorListeners = new Map<string, (event: MonacoChangeEvent) => void>()

type MonacoChangeEvent = {
  changes: Array<{
    range: {
      startLineNumber: number
      startColumn: number
      endLineNumber: number
      endColumn: number
    }
    rangeOffset: number
    rangeLength: number
    text: string
  }>
  eol: string
  versionId: number
  isUndoing: boolean
  isRedoing: boolean
  isFlush: boolean
  isEolChange: boolean
  detailedReasonsChangeLengths: number[]
}

vi.mock('./client', () => ({
  appendSessionHistoryBatch: (...args: unknown[]) => appendSessionHistoryBatch(...args),
}))

vi.mock('../execution/client', () => ({
  createExecutionJob: (...args: unknown[]) => createExecutionJob(...args),
  fetchExecutionJob: (...args: unknown[]) => fetchExecutionJob(...args),
}))

vi.mock('@monaco-editor/react', async () => {
  const React = await import('react')

  function MockEditor({
    path,
    onMount,
    wrapperProps,
  }: {
    path: string
    onMount?: (editor: { getModel: () => { onDidChangeContent: (listener: (event: MonacoChangeEvent) => void) => { dispose: () => void } } }) => void
    wrapperProps?: Record<string, string>
  }) {
    React.useEffect(() => {
      onMount?.({
        getModel: () => ({
          onDidChangeContent: (listener) => {
            editorListeners.set(path, listener)

            return {
              dispose: () => {
                editorListeners.delete(path)
              },
            }
          },
        }),
      })

      return () => {
        editorListeners.delete(path)
      }
    }, [onMount, path])

    return <div data-testid="monaco-editor" data-path={path} {...wrapperProps} />
  }

  return {
    default: MockEditor,
  }
})

async function emitContentChange(path: string, sequenceText: string) {
  const listener = editorListeners.get(path)

  if (!listener) {
    throw new Error(`No Monaco listener registered for ${path}`)
  }

  await act(async () => {
    listener({
      changes: [{
        range: {
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        },
        rangeOffset: 0,
        rangeLength: 0,
        text: sequenceText,
      }],
      eol: '\n',
      versionId: 1,
      isUndoing: false,
      isRedoing: false,
      isFlush: false,
      isEolChange: false,
      detailedReasonsChangeLengths: [],
    })
  })
}

describe('RecordingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    appendSessionHistoryBatch.mockReset()
    appendSessionHistoryBatch.mockResolvedValue({
      totalEvents: 1,
    })
    createExecutionJob.mockReset()
    fetchExecutionJob.mockReset()
    fetchExecutionJob.mockResolvedValue({ job: null })
    editorListeners.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps recording and syncing after switching languages', async () => {
    render(<RecordingPage />)

    await emitContentChange('record:solution.py', 'print("python")')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(appendSessionHistoryBatch).toHaveBeenCalledTimes(1)
    expect(appendSessionHistoryBatch.mock.calls[0]?.[1]).toMatchObject({
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Language'), {
        target: { value: 'javascript' },
      })
    })

    await emitContentChange('record:solution.js', 'console.log("js")')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(appendSessionHistoryBatch).toHaveBeenCalledTimes(2)
    expect(appendSessionHistoryBatch.mock.calls[1]?.[1]).toMatchObject({
      language: 'javascript',
      batchSequence: 1,
      eventOffset: 0,
    })
  })

  it('submits Python execution and renders the current session result', async () => {
    createExecutionJob.mockResolvedValue({
      job: {
        jobId: 'exec-1',
        ownerUid: 'student-1',
        language: 'python',
        source: 'print("hello")',
        sourceSizeBytes: 14,
        status: 'succeeded',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z',
        startedAt: '2026-03-28T00:00:00.500Z',
        completedAt: '2026-03-28T00:00:01.000Z',
        backend: 'test-execution-backend',
        backendJobName: 'job-1',
        errorMessage: null,
        result: {
          status: 'succeeded',
          stdout: 'hello\n',
          stderr: '',
          exitCode: 0,
          durationMs: 42,
          truncated: false,
        },
      },
    })

    render(<RecordingPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Python' }))
    })

    expect(createExecutionJob).toHaveBeenCalledWith({
      language: 'python',
      source: '',
    })
    expect(screen.getByText('Execution succeeded')).toBeInTheDocument()
    expect(screen.getByText('Current job: exec-1')).toBeInTheDocument()
    expect(screen.getByText('Exit status: 0')).toBeInTheDocument()
    expect(screen.getByText('Duration: 42ms')).toBeInTheDocument()
    expect(screen.getByText('Truncated: no')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('hello'))).toBeInTheDocument()
  })

  it('polls an active execution after submission and keeps Java runnable after switching languages', async () => {
    createExecutionJob.mockResolvedValue({
      job: {
        jobId: 'exec-running',
        ownerUid: 'student-1',
        language: 'python',
        source: 'print("waiting")',
        sourceSizeBytes: 16,
        status: 'queued',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:00.000Z',
        startedAt: null,
        completedAt: null,
        backend: 'test-execution-backend',
        backendJobName: 'job-running',
        errorMessage: null,
        result: null,
      },
    })
    fetchExecutionJob.mockResolvedValue({
      job: {
        jobId: 'exec-running',
        ownerUid: 'student-1',
        language: 'python',
        source: 'print("waiting")',
        sourceSizeBytes: 16,
        status: 'succeeded',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:02.000Z',
        startedAt: '2026-03-28T00:00:00.500Z',
        completedAt: '2026-03-28T00:00:02.000Z',
        backend: 'test-execution-backend',
        backendJobName: 'job-running',
        errorMessage: null,
        result: {
          status: 'succeeded',
          stdout: 'done\n',
          stderr: '',
          exitCode: 0,
          durationMs: 200,
          truncated: true,
        },
      },
    })

    render(<RecordingPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Python' }))
    })

    expect(screen.getByText('Execution queued')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(fetchExecutionJob).toHaveBeenCalledWith('exec-running')
    expect(screen.getByText('Execution succeeded')).toBeInTheDocument()
    expect(screen.getByText('Truncated: yes')).toBeInTheDocument()

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Language'), {
        target: { value: 'java' },
      })
    })

    expect(screen.getByRole('button', { name: 'Run Java' })).toBeEnabled()
  })

  it('submits Java execution and shows compile errors in the normal result area', async () => {
    createExecutionJob.mockResolvedValue({
      job: {
        jobId: 'exec-java-1',
        ownerUid: 'student-1',
        language: 'java',
        source: 'public class Main {}',
        sourceSizeBytes: 20,
        status: 'failed',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z',
        startedAt: '2026-03-28T00:00:00.500Z',
        completedAt: '2026-03-28T00:00:01.000Z',
        backend: 'test-execution-backend',
        backendJobName: 'job-java-1',
        errorMessage: null,
        result: {
          status: 'failed',
          stdout: '',
          stderr: 'Main.java:2: error: \';\' expected\n',
          exitCode: 1,
          durationMs: 35,
          truncated: false,
        },
      },
    })

    render(<RecordingPage />)

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Language'), {
        target: { value: 'java' },
      })
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Java' }))
    })

    expect(createExecutionJob).toHaveBeenCalledWith({
      language: 'java',
      source: '',
    })
    expect(screen.getByText('Execution failed')).toBeInTheDocument()
    expect(screen.getByText('Current job: exec-java-1')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("';' expected"))).toBeInTheDocument()
  })

  it('disables execution outside Python and Java', async () => {
    render(<RecordingPage />)

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Language'), {
        target: { value: 'javascript' },
      })
    })

    expect(screen.getByRole('button', { name: 'Run Code' })).toBeDisabled()
    expect(screen.getByText(/Execution is available only when the Python or Java editor is selected/)).toBeInTheDocument()
  })

  it('shows execution errors when submit or refresh fails', async () => {
    createExecutionJob.mockRejectedValue(new Error('Execution submit failed.'))

    render(<RecordingPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Python' }))
    })

    expect(screen.getByText('Execution submit failed.')).toBeInTheDocument()
    expect(screen.getByText('No stdout captured for the current execution.')).toBeInTheDocument()
    expect(screen.getByText('No stderr captured for the current execution.')).toBeInTheDocument()
  })

  it('clears the visible execution result when starting a new session', async () => {
    createExecutionJob.mockResolvedValue({
      job: {
        jobId: 'exec-1',
        ownerUid: 'student-1',
        language: 'python',
        source: 'print("hello")',
        sourceSizeBytes: 14,
        status: 'succeeded',
        createdAt: '2026-03-28T00:00:00.000Z',
        updatedAt: '2026-03-28T00:00:01.000Z',
        startedAt: '2026-03-28T00:00:00.500Z',
        completedAt: '2026-03-28T00:00:01.000Z',
        backend: 'test-execution-backend',
        backendJobName: 'job-1',
        errorMessage: null,
        result: {
          status: 'succeeded',
          stdout: 'hello\n',
          stderr: '',
          exitCode: 0,
          durationMs: 42,
          truncated: false,
        },
      },
    })

    render(<RecordingPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Python' }))
    })

    expect(screen.getByText('Current job: exec-1')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Session' }))
    })

    expect(screen.getByText('No execution submitted in this session yet')).toBeInTheDocument()
    expect(screen.getByText('Current job: none')).toBeInTheDocument()
  })

  it('starts a fresh session by clearing local counters and recorded event state', async () => {
    render(<RecordingPage />)

    const originalSessionLabel = screen.getByText((content) => content.startsWith('Session UUID: ')).textContent

    await emitContentChange('record:solution.py', 'print("python")')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(screen.getByText('1 recorded events')).toBeInTheDocument()
    expect(screen.getByText('1 synced events')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Session' }))
    })

    const nextSessionLabel = screen.getByText((content) => content.startsWith('Session UUID: '))

    expect(nextSessionLabel.textContent).not.toEqual(originalSessionLabel)
    expect(screen.getByText('0 recorded events')).toBeInTheDocument()
    expect(screen.getByText('0 synced events')).toBeInTheDocument()
    expect(screen.getByText('No events recorded yet. Start typing in the editor.')).toBeInTheDocument()
  })
})
