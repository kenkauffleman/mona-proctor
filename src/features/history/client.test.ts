import { appendSessionHistoryBatch, fetchSessionHistory } from './client'

const getCurrentUserIdToken = vi.fn()

vi.mock('../auth/firebaseAuth', () => ({
  getCurrentUserIdToken: () => getCurrentUserIdToken(),
}))

describe('history client auth headers', () => {
  beforeEach(() => {
    getCurrentUserIdToken.mockReset()
    vi.restoreAllMocks()
  })

  it('sends the Firebase ID token with append and load requests', async () => {
    getCurrentUserIdToken.mockResolvedValue('test-id-token')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          sessionId: 'session-1',
          batchSequence: 1,
          acceptedEvents: 1,
          totalEvents: 1,
          totalBatches: 1,
          ownerUid: 'user-1',
          language: 'python',
          batches: [],
          events: [],
        }),
      } as Response)

    await appendSessionHistoryBatch('session-1', {
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [],
    })
    await fetchSessionHistory('session-1')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/history/sessions/session-1/batches', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-id-token',
      },
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [],
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/history/sessions/session-1', {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-id-token',
      },
    })
  })
})
