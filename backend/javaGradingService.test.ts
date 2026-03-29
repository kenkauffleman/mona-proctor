import { describe, expect, it } from 'vitest'
import { InMemoryJavaGradingRepository } from './inMemoryJavaGradingRepository.js'
import { JavaGradingService } from './javaGradingService.js'

describe('java grading service', () => {
  it('normalizes line endings and trailing newlines when aggregating per-test results', async () => {
    const executionResults = [
      {
        jobId: 'exec-1',
        result: {
          status: 'succeeded',
          stdout: '0\r\n',
          stderr: '',
          exitCode: 0,
          durationMs: 10,
          truncated: false,
        },
      },
      {
        jobId: 'exec-2',
        result: {
          status: 'succeeded',
          stdout: '1\n\n',
          stderr: '',
          exitCode: 0,
          durationMs: 10,
          truncated: false,
        },
      },
      {
        jobId: 'exec-3',
        result: {
          status: 'succeeded',
          stdout: '13',
          stderr: '',
          exitCode: 0,
          durationMs: 10,
          truncated: false,
        },
      },
      {
        jobId: 'exec-4',
        result: {
          status: 'succeeded',
          stdout: '55',
          stderr: '',
          exitCode: 0,
          durationMs: 10,
          truncated: false,
        },
      },
    ]

    const submittedJobs = new Map<string, typeof executionResults[number]>()
    let executionIndex = 0

    const executionServiceWithResults = {
      async submitExecution() {
        const next = executionResults[executionIndex]

        if (!next) {
          throw new Error('Unexpected extra execution')
        }

        submittedJobs.set(next.jobId, next)
        executionIndex += 1

        return {
          jobId: next.jobId,
          ownerUid: 'runner',
          language: 'java',
          source: 'public class Main {}',
          sourceSizeBytes: 20,
          status: 'queued',
          createdAt: '',
          updatedAt: '',
          startedAt: null,
          completedAt: null,
          backend: 'test',
          backendJobName: null,
          errorMessage: null,
          result: null,
        }
      },
      async getExecutionJobForRunner(jobId: string) {
        const job = submittedJobs.get(jobId)

        if (!job) {
          return null
        }

        return {
          jobId,
          ownerUid: 'runner',
          language: 'java',
          source: 'public class Main {}',
          sourceSizeBytes: 20,
          status: job.result.status,
          createdAt: '',
          updatedAt: '',
          startedAt: '',
          completedAt: '',
          backend: 'test',
          backendJobName: null,
          errorMessage: null,
          stdin: '',
          result: job.result,
        }
      },
    }

    const service = new JavaGradingService(
      new InMemoryJavaGradingRepository(),
      executionServiceWithResults as never,
    )
    const job = await service.submitJavaGrading(
      { uid: 'owner-1', email: 'owner@example.com' },
      {
        problemId: 'java-fibonacci',
        source: 'public class Main {}',
      },
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    const completedJob = await service.getJavaGradingJob(job.gradingJobId, { uid: 'owner-1', email: 'owner@example.com' })

    expect(completedJob?.result).toMatchObject({
      compileFailed: false,
      overallStatus: 'passed',
      passedTests: 4,
      totalTests: 4,
    })
  })

  it('surfaces compile failures through the structured grading result and marks remaining tests as not run', async () => {
    const submittedJobs = new Map<string, { result: { status: 'failed'; stdout: string; stderr: string; exitCode: number; durationMs: number; truncated: boolean } }>()
    let submissionCount = 0

    const service = new JavaGradingService(
      new InMemoryJavaGradingRepository(),
      {
        async submitExecution() {
          submissionCount += 1
          const jobId = `exec-${submissionCount}`
          submittedJobs.set(jobId, {
            result: {
              status: 'failed',
              stdout: '',
              stderr: 'Main.java:3: error: missing semicolon\n',
              exitCode: 1,
              durationMs: 15,
              truncated: false,
            },
          })

          return {
            jobId,
            ownerUid: 'runner',
            language: 'java',
            source: 'public class Main {}',
            sourceSizeBytes: 20,
            status: 'queued',
            createdAt: '',
            updatedAt: '',
            startedAt: null,
            completedAt: null,
            backend: 'test',
            backendJobName: null,
            errorMessage: null,
            result: null,
          }
        },
        async getExecutionJobForRunner(jobId: string) {
          const job = submittedJobs.get(jobId)

          if (!job) {
            return null
          }

          return {
            jobId,
            ownerUid: 'runner',
            language: 'java',
            source: 'public class Main {}',
            sourceSizeBytes: 20,
            status: 'failed',
            createdAt: '',
            updatedAt: '',
            startedAt: '',
            completedAt: '',
            backend: 'test',
            backendJobName: null,
            errorMessage: null,
            stdin: '',
            result: job.result,
          }
        },
      } as never,
    )

    const job = await service.submitJavaGrading(
      { uid: 'owner-1', email: 'owner@example.com' },
      {
        problemId: 'java-fibonacci',
        source: 'public class Main {}',
      },
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    const completedJob = await service.getJavaGradingJob(job.gradingJobId, { uid: 'owner-1', email: 'owner@example.com' })

    expect(completedJob?.result).toMatchObject({
      compileFailed: true,
      overallStatus: 'error',
      passedTests: 0,
      totalTests: 4,
    })
    expect(completedJob?.result?.tests[0]).toMatchObject({
      status: 'error',
      executionStatus: 'failed',
    })
    expect(completedJob?.result?.tests.slice(1).every((test) => test.status === 'not_run')).toBe(true)
  })
})
