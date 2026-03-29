import type { AuthenticatedUser } from './auth.js'
import type { ExecutionService } from './executionService.js'
import type { JavaGradingRepository } from './javaGradingRepository.js'
import type { CreateJavaGradingRequest, JavaGradingRecord, JavaGradingResult, JavaGradingTestResult } from './javaGradingTypes.js'
import { getProblemById } from './javaProblems.js'

function normalizeStdoutForComparison(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\n+$/u, '')
}

function isCompileFailure(stderr: string, exitCode: number | null) {
  return exitCode === 1 && /Main\.java:\d+:/u.test(stderr)
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export class JavaGradingService {
  constructor(
    private readonly repository: JavaGradingRepository,
    private readonly executionService: ExecutionService,
  ) {}

  async submitJavaGrading(
    owner: AuthenticatedUser,
    request: CreateJavaGradingRequest,
  ): Promise<JavaGradingRecord> {
    const job = await this.repository.createJob({
      owner,
      problemId: request.problemId,
      source: request.source,
    })

    void this.runJavaGrading(job, owner)
    return job
  }

  getJavaGradingJob(gradingJobId: string, owner: AuthenticatedUser) {
    return this.repository.getJob(gradingJobId, owner)
  }

  private async runJavaGrading(job: JavaGradingRecord, owner: AuthenticatedUser) {
    try {
      await this.repository.markJobRunning(job.gradingJobId)
      const problem = getProblemById(job.problemId)
      const testResults: JavaGradingTestResult[] = []
      let compileFailed = false

      for (let index = 0; index < problem.hiddenTests.length; index += 1) {
        const testCase = problem.hiddenTests[index]!
        const executionJob = await this.executionService.submitExecution(
          {
            uid: `java-grading:${job.gradingJobId}:${index}`,
            email: owner.email,
          },
          {
            language: 'java',
            source: job.source,
          },
          {
            stdin: testCase.input,
          },
        )
        const completedExecution = await this.waitForTerminalExecution(executionJob.jobId)
        const executionResult = completedExecution.result

        if (!executionResult) {
          throw new Error(`Execution job ${executionJob.jobId} completed without a result.`)
        }

        if (isCompileFailure(executionResult.stderr, executionResult.exitCode)) {
          compileFailed = true
          testResults.push({
            testId: testCase.testId,
            status: 'error',
            actualStdout: executionResult.stdout,
            expectedStdout: testCase.expectedStdout,
            stderr: executionResult.stderr,
            exitCode: executionResult.exitCode,
            executionStatus: executionResult.status,
          })

          for (let remainingIndex = index + 1; remainingIndex < problem.hiddenTests.length; remainingIndex += 1) {
            const remainingTest = problem.hiddenTests[remainingIndex]!
            testResults.push({
              testId: remainingTest.testId,
              status: 'not_run',
              actualStdout: null,
              expectedStdout: remainingTest.expectedStdout,
              stderr: null,
              exitCode: null,
              executionStatus: null,
            })
          }
          break
        }

        const passed = executionResult.status === 'succeeded'
          && normalizeStdoutForComparison(executionResult.stdout)
            === normalizeStdoutForComparison(testCase.expectedStdout)

        testResults.push({
          testId: testCase.testId,
          status: executionResult.status === 'error' ? 'error' : passed ? 'passed' : 'failed',
          actualStdout: executionResult.stdout,
          expectedStdout: testCase.expectedStdout,
          stderr: executionResult.stderr,
          exitCode: executionResult.exitCode,
          executionStatus: executionResult.status,
        })
      }

      const passedTests = testResults.filter((test) => test.status === 'passed').length
      const overallStatus: JavaGradingResult['overallStatus'] = compileFailed
        ? 'error'
        : passedTests === problem.hiddenTests.length
          ? 'passed'
          : 'failed'
      const summary = compileFailed
        ? 'Compilation failed before the hidden tests could run.'
        : overallStatus === 'passed'
          ? `Passed all ${problem.hiddenTests.length} hidden tests.`
          : `Passed ${passedTests} of ${problem.hiddenTests.length} hidden tests.`

      await this.repository.completeJob(job.gradingJobId, {
        compileFailed,
        overallStatus,
        summary,
        passedTests,
        totalTests: problem.hiddenTests.length,
        tests: testResults,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Java grading failed.'
      await this.repository.failJob(job.gradingJobId, message)
    }
  }

  private async waitForTerminalExecution(jobId: string) {
    const deadline = Date.now() + 30_000

    while (Date.now() < deadline) {
      const job = await this.executionService.getExecutionJobForRunner(jobId)

      if (job?.result) {
        return job
      }

      await wait(250)
    }

    throw new Error(`Timed out waiting for Java grading execution ${jobId}.`)
  }
}
