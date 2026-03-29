import { fetchExecutionJob } from './client'

const getCurrentUserIdToken = vi.fn()

vi.mock('../auth/firebaseAuth', () => ({
  getCurrentUserIdToken: () => getCurrentUserIdToken(),
}))

describe('execution client', () => {
  beforeEach(() => {
    getCurrentUserIdToken.mockReset()
    vi.restoreAllMocks()
  })

  it('loads an execution job by job id', async () => {
    getCurrentUserIdToken.mockResolvedValue('test-id-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          jobId: 'exec-1',
        },
      }),
    } as Response)

    await expect(fetchExecutionJob('exec-1')).resolves.toEqual({
      job: {
        jobId: 'exec-1',
      },
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/execution/jobs/exec-1'),
      expect.any(Object),
    )
  })
})
