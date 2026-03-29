import type { CreateJavaGradingRequest, JavaGradingRecord } from './javaGradingTypes.js'

export type CreateJavaGradingJobRequest = CreateJavaGradingRequest

export type JavaGradingJobResponse = {
  job: JavaGradingRecord
}
