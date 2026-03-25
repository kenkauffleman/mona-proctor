import { runFirestoreSanityCheck } from './firestoreEmulatorSanity'

async function main() {
  const result = await runFirestoreSanityCheck()
  console.log(`Firestore emulator write/read succeeded for project ${result.projectId} via ${result.emulatorHost}.`)
}

main().catch((error: unknown) => {
  console.error('Firestore emulator sanity check failed.')
  console.error(error)
  process.exit(1)
})
