import { runtimeConfig } from '../../config/runtime'
import { getCurrentUserIdToken } from '../auth/firebaseAuth'
import type { JavaGradingJobResponse } from './apiTypes'

type CreateJavaGradingJobRequest = {
  problemId: string
  source: string
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function createAuthHeaders() {
  const idToken = await getCurrentUserIdToken()

  return {
    'content-type': 'application/json',
    ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
  }
}

export async function createJavaGradingJob(request: CreateJavaGradingJobRequest) {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/java-grading/jobs`, {
    method: 'POST',
    headers: await createAuthHeaders(),
    body: JSON.stringify(request),
  })

  return parseJsonResponse<JavaGradingJobResponse>(response)
}

export async function fetchJavaGradingJob(gradingJobId: string) {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/java-grading/jobs/${gradingJobId}`, {
    headers: await createAuthHeaders(),
  })

  return parseJsonResponse<JavaGradingJobResponse>(response)
}
