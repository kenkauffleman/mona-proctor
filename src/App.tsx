import { useEffect, useState, type FormEvent } from 'react'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { RecordingPage } from './features/history/RecordingPage'
import { ReplayPage } from './features/history/ReplayPage'
import { currentPhaseLabel } from './config/currentPhase'
import { runtimeConfig } from './config/runtime'

function getPathname() {
  return window.location.pathname
}

function AuthenticatedApp() {
  const [pathname, setPathname] = useState(getPathname)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, isLoading, isSigningIn, signIn, signOut, user } = useAuth()

  useEffect(() => {
    const handlePopState = () => {
      setPathname(getPathname())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await signIn(email, password)
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="hero">
          <p className="eyebrow">{currentPhaseLabel}</p>
          <h1>{runtimeConfig.appModeLabel}</h1>
          <p className="hero-copy">
            {runtimeConfig.isHostedAuth
              ? 'Waiting for the hosted Firebase Auth session...'
              : 'Waiting for the local auth emulator session...'}
          </p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="hero">
          <p className="eyebrow">{currentPhaseLabel}</p>
          <h1>{runtimeConfig.appModeLabel}</h1>
          <p className="hero-copy">
            {runtimeConfig.isHostedAuth
              ? 'Sign in with a hosted Firebase Auth user before recording history or running code execution.'
              : 'Sign in with a local Firebase Auth emulator user before recording history or running code execution.'}
          </p>
        </section>

        <section className="auth-card" aria-label="Sign in form">
          <h2>{runtimeConfig.isHostedAuth ? 'Hosted sign-in' : 'Local sign-in'}</h2>
          <p>
            {runtimeConfig.isHostedAuth
              ? 'This wave uses Firebase email/password accounts in the hosted project.'
              : 'Default seeded users for this wave use email/password in the Auth emulator.'}
          </p>
          <form className="auth-form" onSubmit={handleSignIn}>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button type="submit" disabled={isSigningIn}>
              {isSigningIn ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          {error ? <p className="auth-error">{error}</p> : null}
        </section>
      </main>
    )
  }

  return (
    <>
      <header className="session-banner">
        <div>
          <strong>Signed in:</strong> {user.email ?? user.uid}
        </div>
        <button type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      {pathname === '/replay' ? <ReplayPage /> : <RecordingPage />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
