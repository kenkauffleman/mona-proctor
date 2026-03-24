import type {
  EditorLanguage,
  EditorLanguageMap,
} from '../features/editor/languages'

type LanguageSelectorProps = {
  languages: EditorLanguageMap
  selectedLanguage: EditorLanguage
  onSelectLanguage: (language: EditorLanguage) => void
}

export function LanguageSelector({
  languages,
  selectedLanguage,
  onSelectLanguage,
}: LanguageSelectorProps) {
  return (
    <label className="language-selector">
      <span>Language</span>
      <select
        value={selectedLanguage}
        onChange={(event) =>
          onSelectLanguage(event.target.value as EditorLanguage)
        }
      >
        {Object.entries(languages).map(([key, language]) => (
          <option key={key} value={key}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  )
}
