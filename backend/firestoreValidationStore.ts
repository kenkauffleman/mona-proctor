import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import type { FirestoreValidationRequest } from './app.js'

export type FirestoreValidationPayload = {
  checkedAt: string
  emulatorHost?: string
  note?: string
  projectId: string
  runId: string
  runtime: 'backend-api'
}

export type FirestoreValidationRecord = {
  collection: string
  documentId: string
  payload: FirestoreValidationPayload
}

const validationCollection = 'backendApiValidationRuns'

function createRunId() {
  return `run-${Date.now()}`
}

export class FirestoreValidationStore {
  constructor(private readonly projectId: string) {
    if (getApps().length === 0) {
      initializeApp({
        projectId,
      })
    }
  }

  async writeAndReadValidation(
    request: FirestoreValidationRequest,
    emulatorHost: string | undefined,
  ): Promise<FirestoreValidationRecord> {
    const firestore = getFirestore()
    const runId = request.runId ?? createRunId()
    const documentReference = firestore.collection(validationCollection).doc(runId)
    const payload: FirestoreValidationPayload = {
      checkedAt: new Date().toISOString(),
      projectId: this.projectId,
      runId,
      runtime: 'backend-api',
    }

    if (emulatorHost) {
      payload.emulatorHost = emulatorHost
    }

    if (request.note) {
      payload.note = request.note
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
      documentId: runId,
      payload: stored,
    }
  }
}
