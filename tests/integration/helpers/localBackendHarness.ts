import { spawn, type ChildProcess } from 'node:child_process'
import process from 'node:process'

type LocalUserSession = {
  idToken: string
  localId: string
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createBackendPort() {
  return 18081 + (process.pid % 1000)
}

export async function waitForHealthcheck(baseUrl: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (response.ok) {
        return
      }
    } catch {
      // Retry until the backend is ready.
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for backend at ${baseUrl}`)
}

export async function startBackendProcess(
  port: number,
  extraEnvironment: NodeJS.ProcessEnv = {},
) {
  const child = spawn('npx', ['tsx', '--no-cache', 'backend/index.ts'], {
    env: {
      ...process.env,
      PORT: String(port),
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor',
      ...extraEnvironment,
    },
    stdio: 'inherit',
  })

  const baseUrl = `http://127.0.0.1:${port}`
  await waitForHealthcheck(baseUrl, 30_000)

  return {
    baseUrl,
    child,
  }
}

export async function stopBackendProcess(child: ChildProcess | null) {
  if (!child) {
    return
  }

  child.kill('SIGTERM')
  await wait(500)
}

type SeedUser = {
  email: string
  password: string
}

const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const authEmulatorBaseUrl = `http://${authEmulatorHost}/identitytoolkit.googleapis.com/v1`
const fakeApiKey = 'demo-mona-proctor-local-key'

export const localAuthUsers: SeedUser[] = [
  { email: 'student1@example.com', password: 'pass1234' },
  { email: 'student2@example.com', password: 'pass1234' },
]

async function authRequest<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${authEmulatorBaseUrl}/${path}?key=${fakeApiKey}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json() as T & { error?: { message?: string } }

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Auth emulator request failed for ${path}.`)
  }

  return payload
}

export async function ensureLocalAuthUser(user: SeedUser) {
  try {
    await authRequest('accounts:signUp', {
      email: user.email,
      password: user.password,
      returnSecureToken: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown auth emulator error.'

    if (!message.includes('EMAIL_EXISTS')) {
      throw error
    }
  }
}

export async function signInLocalAuthUser(user: SeedUser): Promise<LocalUserSession> {
  return authRequest<LocalUserSession>('accounts:signInWithPassword', {
    email: user.email,
    password: user.password,
    returnSecureToken: true,
  })
}

export async function ensureDefaultLocalAuthUsers() {
  for (const user of localAuthUsers) {
    await ensureLocalAuthUser(user)
  }
}

export function createAuthHeaders(idToken: string) {
  return {
    authorization: `Bearer ${idToken}`,
    'content-type': 'application/json',
  }
}
