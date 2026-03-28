// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Firestore } from '@google-cloud/firestore'
import { replayRecordedMonacoEvents } from '../../src/features/history/history.js'
import {
  createAuthHeaders,
  createBackendPort,
  ensureDefaultLocalAuthUsers,
  localAuthUsers,
  signInLocalAuthUser,
  startBackendProcess,
  stopBackendProcess,
} from './helpers/localBackendHarness.js'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

describe('history auth integration', () => {
  let backendProcess: Awaited<ReturnType<typeof startBackendProcess>> | null = null

  beforeEach(async () => {
    await ensureDefaultLocalAuthUsers()
  })

  afterEach(async () => {
    await stopBackendProcess(backendProcess?.child ?? null)
    backendProcess = null
  })

  it('stores authenticated history in Firestore and denies cross-user replay access', async () => {
    backendProcess = await startBackendProcess(createBackendPort())

    const firstUser = await signInLocalAuthUser(localAuthUsers[0]!)
    const secondUser = await signInLocalAuthUser(localAuthUsers[1]!)
    const sessionId = `wave14-history-${Date.now()}`
    const firstBatch = {
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [{
        sequence: 1,
        timestamp: 100,
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
          rangeOffset: 0,
          rangeLength: 0,
          text: 'hello',
        }],
      }],
    }
    const secondBatch = {
      ...firstBatch,
      batchSequence: 2,
      eventOffset: 1,
      events: [{
        ...firstBatch.events[0],
        sequence: 2,
        timestamp: 200,
        versionId: 2,
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 6,
            endLineNumber: 1,
            endColumn: 6,
          },
          rangeOffset: 5,
          rangeLength: 0,
          text: ' world',
        }],
      }],
    }

    for (const batch of [firstBatch, secondBatch]) {
      const response = await fetch(`${backendProcess.baseUrl}/api/history/sessions/${sessionId}/batches`, {
        method: 'POST',
        headers: createAuthHeaders(firstUser.idToken),
        body: JSON.stringify(batch),
      })

      expect(response.status).toBe(200)
    }

    const sessionResponse = await fetch(`${backendProcess.baseUrl}/api/history/sessions/${sessionId}`, {
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
      },
    })

    expect(sessionResponse.status).toBe(200)

    const session = await sessionResponse.json() as {
      ownerUid: string
      batches: Array<{ batchSequence: number; eventCount: number }>
      events: typeof firstBatch.events
    }

    expect(session.ownerUid).toBe(firstUser.localId)
    expect(session.batches).toHaveLength(2)
    expect(replayRecordedMonacoEvents('', session.events)).toBe('hello world')

    const forbiddenResponse = await fetch(`${backendProcess.baseUrl}/api/history/sessions/${sessionId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    expect(forbiddenResponse.status).toBe(403)
    expect(await forbiddenResponse.json()).toEqual({
      ok: false,
      error: 'Authenticated user does not own this session.',
    })

    const firestore = new Firestore({ projectId })
    const sessionSnapshot = await firestore.collection('historySessions').doc(sessionId).get()
    const sessionData = sessionSnapshot.data() as { ownerUid?: string } | undefined

    expect(sessionSnapshot.exists).toBe(true)
    expect(sessionData?.ownerUid).toBe(firstUser.localId)

    const batchSnapshots = await firestore
      .collection('historySessions')
      .doc(sessionId)
      .collection('batches')
      .orderBy('batchSequence', 'asc')
      .get()

    expect(batchSnapshots.size).toBe(2)
  })
})
