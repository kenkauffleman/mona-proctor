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
  it('renders the phase 2 demo shell with empty record and replay editors', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'In-Memory Monaco History Prototype',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('python')
    expect(screen.getAllByTestId('monaco-editor')).toHaveLength(2)
    expect(screen.getByLabelText('Record editor')).toHaveTextContent('')
    expect(screen.getByLabelText('Replay editor')).toHaveTextContent('')
    expect(
      screen.getByRole('button', { name: 'Watch Replay' }),
    ).toBeDisabled()
  })
})
