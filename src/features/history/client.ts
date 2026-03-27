import { getCurrentUserIdToken } from '../auth/firebaseAuth'
import type {
  AppendHistoryBatchRequest,
  AppendHistoryBatchResponse,
  HistorySessionResponse,
} from './apiTypes'

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

export async function appendSessionHistoryBatch(
  sessionId: string,
  request: AppendHistoryBatchRequest,
) {
  const response = await fetch(`/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: await createAuthHeaders(),
    body: JSON.stringify(request),
  })

  return parseJsonResponse<AppendHistoryBatchResponse>(response)
}

export async function fetchSessionHistory(sessionId: string) {
  const response = await fetch(`/api/history/sessions/${sessionId}`, {
    headers: await createAuthHeaders(),
  })

  return parseJsonResponse<HistorySessionResponse>(response)
}
