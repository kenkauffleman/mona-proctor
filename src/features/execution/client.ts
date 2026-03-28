import { runtimeConfig } from '../../config/runtime'
import { getCurrentUserIdToken } from '../auth/firebaseAuth'
import type { ExecutionJobResponse, LatestExecutionJobResponse } from './apiTypes'

type CreateExecutionJobRequest = {
  language: 'python'
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

export async function createExecutionJob(request: CreateExecutionJobRequest) {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/execution/jobs`, {
    method: 'POST',
    headers: await createAuthHeaders(),
    body: JSON.stringify(request),
  })

  return parseJsonResponse<ExecutionJobResponse>(response)
}

export async function fetchExecutionJob(jobId: string) {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/execution/jobs/${jobId}`, {
    headers: await createAuthHeaders(),
  })

  return parseJsonResponse<ExecutionJobResponse>(response)
}

export async function fetchLatestExecutionJob() {
  const response = await fetch(`${runtimeConfig.apiBaseUrl}/execution/jobs/latest`, {
    headers: await createAuthHeaders(),
  })

  return parseJsonResponse<LatestExecutionJobResponse>(response)
}
