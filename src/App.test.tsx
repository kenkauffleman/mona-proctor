import { act, fireEvent, render, screen } from '@testing-library/react'
import App from './App'

const useAuth = vi.fn()
const fetchLatestExecutionJob = vi.fn()
const signIn = vi.fn()
const signOut = vi.fn()

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
    signIn.mockReset()
    signOut.mockReset()
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
      signIn,
      signOut,
      user: null,
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Local Firebase Auth validation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('submits the entered credentials through the auth context', async () => {
    useAuth.mockReturnValue({
      error: null,
      isLoading: false,
      isSigningIn: false,
      signIn,
      signOut,
      user: null,
    })

    render(<App />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'student1@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'pass1234' },
    })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!)
    })

    expect(signIn).toHaveBeenCalledWith('student1@example.com', 'pass1234')
  })

  it('renders the recording page once a user is authenticated', async () => {
    useAuth.mockReturnValue({
      error: null,
      isLoading: false,
      isSigningIn: false,
      signIn,
      signOut,
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

  it('renders the replay page for the replay route and lets the user sign out', async () => {
    window.history.pushState({}, '', '/replay?sessionId=session-123')

    useAuth.mockReturnValue({
      error: null,
      isLoading: false,
      isSigningIn: false,
      signIn,
      signOut,
      user: {
        email: 'student1@example.com',
        uid: 'student-1',
      },
    })

    render(<App />)
    await act(async () => {})

    expect(
      screen.getByRole('heading', {
        name: 'Session Replay',
      }),
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    })

    expect(signOut).toHaveBeenCalledTimes(1)
    window.history.pushState({}, '', '/')
  })
})
