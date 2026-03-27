import {
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { User } from 'firebase/auth'
import {
  signInWithLocalEmailPassword,
  signOutCurrentUser,
  subscribeToAuthState,
} from './firebaseAuth'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeToAuthState((nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    error,
    isLoading,
    isSigningIn,
    async signIn(email: string, password: string) {
      setIsSigningIn(true)
      setError(null)

      try {
        await signInWithLocalEmailPassword(email, password)
      } catch (signInError) {
        setError(signInError instanceof Error ? signInError.message : 'Sign-in failed.')
      } finally {
        setIsSigningIn(false)
      }
    },
    async signOut() {
      setError(null)
      await signOutCurrentUser()
    },
    user,
  }), [error, isLoading, isSigningIn, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
