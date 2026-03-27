import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'

const projectId = 'demo-mona-proctor'

function getEmulatorOrigin() {
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:9099`
}

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0]!
  }

  return initializeApp({
    apiKey: 'demo-mona-proctor-local-key',
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId: 'demo-mona-proctor-local-app',
  })
}

let authConfigured = false

export function getFirebaseAuth() {
  const auth = getAuth(getFirebaseApp())

  if (!authConfigured) {
    connectAuthEmulator(auth, getEmulatorOrigin(), { disableWarnings: true })
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
