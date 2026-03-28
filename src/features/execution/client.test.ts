import { fetchLatestExecutionJob } from './client'

const getCurrentUserIdToken = vi.fn()

vi.mock('../auth/firebaseAuth', () => ({
  getCurrentUserIdToken: () => getCurrentUserIdToken(),
}))

describe('execution client', () => {
  beforeEach(() => {
    getCurrentUserIdToken.mockReset()
    vi.restoreAllMocks()
  })

  it('treats a latest-job 404 as no stored execution result yet', async () => {
    getCurrentUserIdToken.mockResolvedValue('test-id-token')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '{"ok":false,"error":"Execution job not found."}',
    } as Response)

    await expect(fetchLatestExecutionJob()).resolves.toEqual({
      job: null,
    })
  })
})
