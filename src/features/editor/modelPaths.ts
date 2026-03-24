import type { EditorLanguageConfig } from './languages'

export function getRecordEditorModelPath(language: EditorLanguageConfig) {
  return `record:${language.fileName}`
}

export function getReplayEditorModelPath(language: EditorLanguageConfig) {
  return `replay:${language.fileName}`
}
