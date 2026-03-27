type RuntimeConfig = {
  apiBaseUrl: string
  appModeLabel: string
  authEmulatorHost: string | null
  firebase: {
    apiKey: string
    appId: string
    authDomain: string
    projectId: string
  }
  isHostedAuth: boolean
}

function readRequiredEnv(name: keyof ImportMetaEnv, fallback?: string) {
  const value = import.meta.env[name] ?? fallback

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required frontend runtime setting: ${name}`)
  }

  return value
}

function normalizeApiBaseUrl(value: string) {
  if (value === '/api') {
    return value
  }

  return value.replace(/\/+$/, '')
}

function getDefaultAuthEmulatorHost() {
  if (import.meta.env.PROD) {
    return null
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:9099'
  }

  const protocol = window.location.protocol === 'http:' || window.location.protocol === 'https:'
    ? window.location.protocol
    : 'http:'
  const hostname = window.location.hostname || '127.0.0.1'

  return `${protocol}//${hostname}:9099`
}

const authEmulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST?.trim() || getDefaultAuthEmulatorHost()
const firebaseProjectId = readRequiredEnv('VITE_FIREBASE_PROJECT_ID', 'demo-mona-proctor')
const apiBaseUrl = normalizeApiBaseUrl(readRequiredEnv('VITE_API_BASE_URL', '/api'))

export const runtimeConfig: RuntimeConfig = {
  apiBaseUrl,
  appModeLabel: authEmulatorHost ? 'Local Firebase Auth validation' : 'Hosted Firebase Auth validation',
  authEmulatorHost,
  firebase: {
    apiKey: readRequiredEnv(
      'VITE_FIREBASE_API_KEY',
      authEmulatorHost ? 'demo-mona-proctor-local-key' : undefined,
    ),
    appId: readRequiredEnv(
      'VITE_FIREBASE_APP_ID',
      authEmulatorHost ? 'demo-mona-proctor-local-app' : undefined,
    ),
    authDomain: readRequiredEnv(
      'VITE_FIREBASE_AUTH_DOMAIN',
      `${firebaseProjectId}.firebaseapp.com`,
    ),
    projectId: firebaseProjectId,
  },
  isHostedAuth: !authEmulatorHost,
}
