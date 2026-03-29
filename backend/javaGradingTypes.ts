import type { ExecutionResult } from './executionTypes.js'

export const javaGradingTerminalStatuses = ['passed', 'failed', 'error'] as const
export const javaGradingActiveStatuses = ['queued', 'running'] as const

export type JavaGradingStatus =
  | (typeof javaGradingActiveStatuses)[number]
  | (typeof javaGradingTerminalStatuses)[number]

export type JavaGradingTestResult = {
  testId: string
  status: 'passed' | 'failed' | 'error' | 'not_run'
  actualStdout: string | null
  expectedStdout: string | null
  stderr: string | null
  exitCode: number | null
  executionStatus: ExecutionResult['status'] | null
}

export type JavaGradingResult = {
  compileFailed: boolean
  overallStatus: 'passed' | 'failed' | 'error'
  summary: string
  passedTests: number
  totalTests: number
  tests: JavaGradingTestResult[]
}

export type CreateJavaGradingRequest = {
  problemId: string
  source: string
}

export type JavaGradingRecord = {
  gradingJobId: string
  ownerUid: string
  language: 'java'
  problemId: string
  source: string
  sourceSizeBytes: number
  status: JavaGradingStatus
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  result: JavaGradingResult | null
}
