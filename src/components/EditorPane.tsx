import Editor, { type OnMount } from '@monaco-editor/react'
import type { EditorLanguageConfig } from '../features/editor/languages'

type EditorPaneProps = {
  language: EditorLanguageConfig
  modelPath: string
  source: string
  onSourceChange?: (value: string) => void
  onMount?: OnMount
  readOnly?: boolean
  height?: string
  ariaLabel?: string
}

export function EditorPane({
  language,
  modelPath,
  source,
  onSourceChange,
  onMount,
  readOnly = false,
  height = '65vh',
  ariaLabel,
}: EditorPaneProps) {
  const handleChange = (value: string | undefined) => {
    onSourceChange?.(value ?? '')
  }

  return (
    <div className="editor-panel">
      <Editor
        height={height}
        language={language.monacoLanguage}
        path={modelPath}
        theme="vs-dark"
        value={source}
        onChange={handleChange}
        onMount={onMount}
        loading="Loading editor..."
        wrapperProps={ariaLabel ? { 'aria-label': ariaLabel } : undefined}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 15,
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          readOnly,
        }}
      />
    </div>
  )
}
