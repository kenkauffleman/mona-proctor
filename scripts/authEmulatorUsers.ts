const defaultAuthEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const authEmulatorBaseUrl = `http://${defaultAuthEmulatorHost}/identitytoolkit.googleapis.com/v1`
const fakeApiKey = 'demo-mona-proctor-local-key'

export type LocalAuthUser = {
  email: string
  password: string
}

export const localAuthUsers: LocalAuthUser[] = [
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

export async function ensureLocalAuthUser(user: LocalAuthUser) {
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

export async function signInLocalAuthUser(user: LocalAuthUser) {
  return authRequest<{ idToken: string; localId: string }>('accounts:signInWithPassword', {
    email: user.email,
    password: user.password,
    returnSecureToken: true,
  })
}
