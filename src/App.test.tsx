import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('@monaco-editor/react', () => ({
  default: ({
    language,
    value,
    wrapperProps,
  }: {
    language: string
    value: string
    wrapperProps?: Record<string, string>
  }) => (
    <div
      data-testid="monaco-editor"
      data-language={language}
      {...wrapperProps}
    >
      {value}
    </div>
  ),
}))

describe('App', () => {
  it('renders the recording page by default', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Local Client/Backend/Firestore Prototype',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('python')
    expect(screen.getAllByTestId('monaco-editor')).toHaveLength(1)
    expect(screen.getByLabelText('Record editor')).toHaveTextContent('')
    expect(
      screen.getByText(/Session UUID:/),
    ).toBeInTheDocument()
  })
})
