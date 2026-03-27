import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { runtimeConfig } from '../../config/runtime'

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  return initializeApp(runtimeConfig.firebase)
}

let authConfigured = false

export function getFirebaseAuth() {
  const auth = getAuth(getFirebaseApp())

  if (!authConfigured && runtimeConfig.authEmulatorHost) {
    connectAuthEmulator(auth, runtimeConfig.authEmulatorHost, { disableWarnings: true })
    authConfigured = true
  }

  return auth
}

export function subscribeToAuthState(listener: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), listener)
}

export async function signInWithLocalEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function signOutCurrentUser() {
  await signOut(getFirebaseAuth())
}

export async function getCurrentUserIdToken() {
  const currentUser = getFirebaseAuth().currentUser

  if (!currentUser) {
    return null
  }

  return currentUser.getIdToken()
}
