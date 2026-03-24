import Editor from '@monaco-editor/react'
import type { EditorLanguageConfig } from '../features/editor/languages'

type EditorPaneProps = {
  language: EditorLanguageConfig
  source: string
  onSourceChange: (value: string) => void
}

export function EditorPane({
  language,
  source,
  onSourceChange,
}: EditorPaneProps) {
  return (
    <div className="editor-panel">
      <Editor
        height="65vh"
        language={language.monacoLanguage}
        path={language.fileName}
        theme="vs-dark"
        value={source}
        onChange={(value) => onSourceChange(value ?? '')}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 15,
          padding: { top: 16 },
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  )
}
