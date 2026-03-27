import { ensureLocalAuthUser, localAuthUsers } from './authEmulatorUsers.js'

async function main() {
  for (const user of localAuthUsers) {
    await ensureLocalAuthUser(user)
  }

  console.log(`Seeded ${localAuthUsers.length} local Auth emulator users.`)
}

main().catch((error: unknown) => {
  console.error('Failed to seed local Auth emulator users.')
  console.error(error)
  process.exit(1)
})
