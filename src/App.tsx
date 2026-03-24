import { useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { LanguageSelector } from './components/LanguageSelector'
import {
  editorLanguages,
  initialSourcesByLanguage,
  type EditorLanguage,
} from './features/editor/languages'

export default function App() {
  const [activeLanguage, setActiveLanguage] = useState<EditorLanguage>('python')
  const [sources, setSources] = useState(initialSourcesByLanguage)

  const handleSourceChange = (nextSource: string) => {
    setSources((current) => ({
      ...current,
      [activeLanguage]: nextSource,
    }))
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 1</p>
        <h1>Assessment Editor</h1>
        <p className="hero-copy">
          A focused Monaco-based coding surface for Python, Java, and
          JavaScript. This shell is intentionally small so Phase 2 can add
          client-side history capture cleanly.
        </p>
      </section>

      <section className="workspace" aria-label="Editor workspace">
        <div className="workspace-toolbar">
          <div>
            <h2>Editor</h2>
            <p>Switch languages without losing in-progress code.</p>
          </div>
          <LanguageSelector
            languages={editorLanguages}
            selectedLanguage={activeLanguage}
            onSelectLanguage={setActiveLanguage}
          />
        </div>

        <div className="workspace-meta" aria-label="Current editor details">
          <span>{editorLanguages[activeLanguage].label}</span>
          <span>{editorLanguages[activeLanguage].monacoLanguage}</span>
          <span>Local session state only</span>
        </div>

        <EditorPane
          language={editorLanguages[activeLanguage]}
          source={sources[activeLanguage]}
          onSourceChange={handleSourceChange}
        />
      </section>
    </main>
  )
}
