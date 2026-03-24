import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('@monaco-editor/react', () => ({
  default: ({ language, value }: { language: string; value: string }) => (
    <div data-testid="monaco-editor" data-language={language}>
      {value}
    </div>
  ),
}))

describe('App', () => {
  it('renders the editor shell with the default language', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Assessment Editor' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('python')
    expect(screen.getByTestId('monaco-editor')).toHaveAttribute(
      'data-language',
      'python',
    )
  })
})
