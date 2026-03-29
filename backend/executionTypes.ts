export const executionLanguages = ['python', 'java'] as const

export type ExecutionLanguage = (typeof executionLanguages)[number]

export const terminalExecutionStatuses = [
  'succeeded',
  'failed',
  'timed_out',
  'error',
] as const

export const activeExecutionStatuses = [
  'queued',
  'running',
] as const

export type ExecutionStatus =
  | (typeof activeExecutionStatuses)[number]
  | (typeof terminalExecutionStatuses)[number]

export type ExecutionResult = {
  status: ExecutionStatus
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs: number | null
  truncated: boolean
}

export type CreateExecutionRequest = {
  language: ExecutionLanguage
  source: string
}

export type ExecutionRecord = {
  jobId: string
  ownerUid: string
  language: ExecutionLanguage
  source: string
  sourceSizeBytes: number
  status: ExecutionStatus
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  backend: string
  backendJobName: string | null
  errorMessage: string | null
  result: ExecutionResult | null
}

export type ExecutionLimits = {
  globalActiveJobLimit: number
  languageLimits: Record<ExecutionLanguage, {
    maxSourceBytes: number
    timeoutMs: number
    maxStdoutBytes: number
    maxStderrBytes: number
  }>
}

export type CreateExecutionResponse = {
  job: ExecutionRecord
}
