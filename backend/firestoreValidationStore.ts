import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export type FirestoreValidationPayload = {
  checkedAt: string
  emulatorHost?: string
  message: string
  projectId: string
  runtime: 'backend-container'
}

export type FirestoreValidationRecord = {
  collection: string
  documentId: string
  payload: FirestoreValidationPayload
}

const validationCollection = 'backendValidationChecks'
const validationDocumentId = 'container-firestore-validation'

export class FirestoreValidationStore {
  constructor(private readonly projectId: string) {
    if (getApps().length === 0) {
      initializeApp({
        projectId,
      })
    }
  }

  async writeAndReadValidation(
    emulatorHost: string | undefined,
  ): Promise<FirestoreValidationRecord> {
    const firestore = getFirestore()
    const documentReference = firestore.collection(validationCollection).doc(validationDocumentId)
    const payload: FirestoreValidationPayload = {
      checkedAt: new Date().toISOString(),
      emulatorHost,
      message: 'Backend container Firestore validation succeeded.',
      projectId: this.projectId,
      runtime: 'backend-container',
    }

    await documentReference.set(payload)

    const snapshot = await documentReference.get()

    if (!snapshot.exists) {
      throw new Error('Validation document was not found after write.')
    }

    const stored = snapshot.data() as FirestoreValidationPayload | undefined

    if (!stored) {
      throw new Error('Validation document payload was empty.')
    }

    return {
      collection: validationCollection,
      documentId: validationDocumentId,
      payload: stored,
    }
  }
}
