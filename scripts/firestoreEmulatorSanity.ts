import { Firestore } from '@google-cloud/firestore'

export type FirestoreSanityResult = {
  emulatorHost: string
  fetched: Record<string, unknown>
  projectId: string
}

export function getFirestoreSanityEnvironment() {
  const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

  if (!emulatorHost) {
    throw new Error('FIRESTORE_EMULATOR_HOST is not set. Start this script through the Firebase emulator.')
  }

  return { emulatorHost, projectId }
}

export async function runFirestoreSanityCheck() {
  const { emulatorHost, projectId } = getFirestoreSanityEnvironment()
  const firestore = new Firestore({ projectId })
  const documentReference = firestore
    .collection('sanityChecks')
    .doc('local-firestore-emulator')

  const payload = {
    checkedAt: new Date().toISOString(),
    emulatorHost,
    message: 'Firestore emulator read/write sanity check passed.',
    projectId,
  }

  await documentReference.set(payload)

  const snapshot = await documentReference.get()

  if (!snapshot.exists) {
    throw new Error('Sanity check document was not found after write.')
  }

  const stored = snapshot.data()

  if (!stored || stored.message !== payload.message || stored.emulatorHost !== emulatorHost) {
    throw new Error(`Unexpected sanity check document contents: ${JSON.stringify(stored)}`)
  }

  return {
    emulatorHost,
    fetched: stored as Record<string, unknown>,
    projectId,
  } satisfies FirestoreSanityResult
}
