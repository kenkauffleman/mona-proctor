import { createJavaGradingJob, fetchJavaGradingJob } from './client'

const getCurrentUserIdToken = vi.fn()

vi.mock('../auth/firebaseAuth', () => ({
  getCurrentUserIdToken: () => getCurrentUserIdToken(),
}))

describe('java grading client', () => {
  beforeEach(() => {
    getCurrentUserIdToken.mockReset()
    vi.restoreAllMocks()
  })

  it('creates a Java grading job', async () => {
    getCurrentUserIdToken.mockResolvedValue('test-id-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          gradingJobId: 'grade-java-1',
        },
      }),
    } as Response)

    await expect(createJavaGradingJob({
      problemId: 'java-fibonacci',
      source: 'public class Main {}',
    })).resolves.toEqual({
      job: {
        gradingJobId: 'grade-java-1',
      },
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/java-grading/jobs'),
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('loads a Java grading job by job id', async () => {
    getCurrentUserIdToken.mockResolvedValue('test-id-token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          gradingJobId: 'grade-java-1',
        },
      }),
    } as Response)

    await expect(fetchJavaGradingJob('grade-java-1')).resolves.toEqual({
      job: {
        gradingJobId: 'grade-java-1',
      },
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/java-grading/jobs/grade-java-1'),
      expect.any(Object),
    )
  })
})
