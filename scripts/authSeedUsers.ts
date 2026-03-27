export type AuthSeedUser = {
  email: string
  password: string
}

export const defaultLocalAuthSeedUsers: AuthSeedUser[] = [
  { email: 'student1@example.com', password: 'pass1234' },
  { email: 'student2@example.com', password: 'pass1234' },
]

export function parseAuthSeedUsers(
  envValue: string | undefined,
  options: {
    fallbackUsers?: AuthSeedUser[]
    required?: boolean
  } = {},
) {
  if (!envValue || envValue.trim().length === 0) {
    if (options.required) {
      throw new Error('AUTH_SEED_USERS_JSON must be set to a JSON array of {email,password} objects.')
    }

    return options.fallbackUsers ?? []
  }

  const parsed = JSON.parse(envValue) as unknown

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AUTH_SEED_USERS_JSON must be a non-empty JSON array.')
  }

  const users = parsed.map((value) => {
    if (
      typeof value !== 'object'
      || value === null
      || typeof value.email !== 'string'
      || value.email.trim().length === 0
      || typeof value.password !== 'string'
      || value.password.length === 0
    ) {
      throw new Error('Each AUTH_SEED_USERS_JSON entry must include non-empty string email and password fields.')
    }

    return {
      email: value.email.trim(),
      password: value.password,
    } satisfies AuthSeedUser
  })

  return users
}
