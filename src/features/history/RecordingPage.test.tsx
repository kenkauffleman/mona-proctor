import { act, fireEvent, render, screen } from '@testing-library/react'
import { RecordingPage } from './RecordingPage'

const appendSessionHistoryBatch = vi.fn()
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
})
