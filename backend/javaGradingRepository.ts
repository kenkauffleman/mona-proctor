import type { AuthenticatedUser } from './auth.js'
import type { JavaGradingRecord, JavaGradingResult } from './javaGradingTypes.js'

export type CreateJavaGradingJobInput = {
  owner: AuthenticatedUser
  problemId: string
  source: string
}

export interface JavaGradingRepository {
  createJob(input: CreateJavaGradingJobInput): Promise<JavaGradingRecord>
  getJob(gradingJobId: string, owner: AuthenticatedUser): Promise<JavaGradingRecord | null>
  markJobRunning(gradingJobId: string): Promise<JavaGradingRecord>
  completeJob(gradingJobId: string, result: JavaGradingResult): Promise<JavaGradingRecord>
  failJob(gradingJobId: string, message: string): Promise<JavaGradingRecord>
}
