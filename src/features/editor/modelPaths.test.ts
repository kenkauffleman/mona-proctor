import { describe, expect, it } from 'vitest'
import { editorLanguages } from './languages'
import {
  getRecordEditorModelPath,
  getReplayEditorModelPath,
} from './modelPaths'

describe('editor model paths', () => {
  it('uses distinct Monaco model paths for record and replay editors', () => {
    const language = editorLanguages.python

    expect(getRecordEditorModelPath(language)).toBe('record:solution.py')
    expect(getReplayEditorModelPath(language)).toBe('replay:solution.py')
    expect(getRecordEditorModelPath(language)).not.toBe(
      getReplayEditorModelPath(language),
    )
  })

  it('keeps model identities distinct across supported languages', () => {
    const recordPaths = Object.values(editorLanguages).map(getRecordEditorModelPath)
    const replayPaths = Object.values(editorLanguages).map(getReplayEditorModelPath)

    expect(new Set(recordPaths).size).toBe(recordPaths.length)
    expect(new Set(replayPaths).size).toBe(replayPaths.length)
    expect(recordPaths.every((path) => !replayPaths.includes(path))).toBe(true)
  })
})
