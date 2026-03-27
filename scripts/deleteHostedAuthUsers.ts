import process from 'node:process'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { parseAuthSeedUsers } from './authSeedUsers.js'

function parseArgs(argv: string[]) {
  let projectId = process.env.DEPLOY_PROJECT_ID ?? process.env.GCLOUD_PROJECT
  const users = parseAuthSeedUsers(process.env.AUTH_SEED_USERS_JSON, { required: true })

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]

    switch (argument) {
      case '--project':
        if (!value) {
          throw new Error('Missing value for --project')
        }
        projectId = value
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (!projectId) {
    throw new Error('Hosted auth deletion requires a project id.')
  }

  return { projectId, users }
}

async function main() {
  const config = parseArgs(process.argv.slice(2))

  if (getApps().length === 0) {
    initializeApp({ projectId: config.projectId })
  }

  const auth = getAuth()

  for (const user of config.users) {
    try {
      const existingUser = await auth.getUserByEmail(user.email)
      await auth.deleteUser(existingUser.uid)
      console.log(`Deleted hosted auth user ${user.email}`)
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : ''

      if (code === 'auth/user-not-found') {
        console.log(`Hosted auth user ${user.email} was already absent`)
        continue
      }

      throw error
    }
  }
}

main().catch((error: unknown) => {
  console.error('Hosted auth deletion failed.')
  console.error(error)
  process.exit(1)
})
