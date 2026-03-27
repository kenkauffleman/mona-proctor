import { createContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthContextValue = {
  error: string | null
  isLoading: boolean
  isSigningIn: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  user: User | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)
