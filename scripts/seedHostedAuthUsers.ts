import process from 'node:process'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { parseAuthSeedUsers, type AuthSeedUser } from './authSeedUsers.js'

type Config = {
  projectId: string
  users: AuthSeedUser[]
}

function parseArgs(argv: string[]): Config {
  const projectId = process.env.DEPLOY_PROJECT_ID ?? process.env.GCLOUD_PROJECT
  const users = parseAuthSeedUsers(process.env.AUTH_SEED_USERS_JSON, { required: true })

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]

    switch (argument) {
      case '--project':
        if (!value) {
          throw new Error('Missing value for --project')
        }
        process.env.GCLOUD_PROJECT = value
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${argument}`)
    }
  }

  const resolvedProjectId = process.env.GCLOUD_PROJECT ?? projectId

  if (!resolvedProjectId) {
    throw new Error('Hosted auth seeding requires a project id.')
  }

  return {
    projectId: resolvedProjectId,
    users,
  }
}

async function ensureUser(user: AuthSeedUser) {
  const auth = getAuth()

  try {
    const existingUser = await auth.getUserByEmail(user.email)
    await auth.updateUser(existingUser.uid, {
      email: user.email,
      emailVerified: true,
      password: user.password,
    })
    console.log(`Updated hosted auth user ${user.email}`)
    return
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : ''
    const message = error instanceof Error ? error.message : ''

    if (code !== 'auth/user-not-found' && !message.includes('There is no user record')) {
      throw error
    }
  }

  await auth.createUser({
    email: user.email,
    emailVerified: true,
    password: user.password,
  })
  console.log(`Created hosted auth user ${user.email}`)
}

async function main() {
  const config = parseArgs(process.argv.slice(2))

  if (getApps().length === 0) {
    initializeApp({ projectId: config.projectId })
  }

  for (const user of config.users) {
    await ensureUser(user)
  }
}

main().catch((error: unknown) => {
  console.error('Hosted auth seeding failed.')
  console.error(error)
  process.exit(1)
})
