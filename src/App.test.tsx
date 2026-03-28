import { act, render, screen } from '@testing-library/react'
import App from './App'

const useAuth = vi.fn()
const fetchLatestExecutionJob = vi.fn()

vi.mock('./features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('./features/auth/useAuth', () => ({
  useAuth: () => useAuth(),
}))

vi.mock('./features/execution/client', () => ({
  createExecutionJob: vi.fn(),
  fetchExecutionJob: vi.fn(),
  fetchLatestExecutionJob: (...args: unknown[]) => fetchLatestExecutionJob(...args),
}))

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
  beforeEach(() => {
    fetchLatestExecutionJob.mockReset()
    fetchLatestExecutionJob.mockResolvedValue({ job: null })
  })

  it('renders an auth loading message while the emulator session is resolving', () => {
    useAuth.mockReturnValue({
      error: null,
      isLoading: true,
      isSigningIn: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: null,
    })

    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Local Firebase Auth validation',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the local auth emulator session/)).toBeInTheDocument()
  })

  it('renders the local sign-in form when no authenticated user is present', () => {
    useAuth.mockReturnValue({
      error: null,
      isLoading: false,
      isSigningIn: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: null,
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Local Firebase Auth validation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('renders the recording page once a user is authenticated', async () => {
    useAuth.mockReturnValue({
      error: null,
      isLoading: false,
      isSigningIn: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      user: {
        email: 'student1@example.com',
        uid: 'student-1',
      },
    })

    render(<App />)
    await act(async () => {})

    expect(
      screen.getByRole('heading', {
        name: 'Authenticated Python execution',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('student1@example.com')).toBeInTheDocument()
    expect(screen.getAllByTestId('monaco-editor')).toHaveLength(1)
  })
})
