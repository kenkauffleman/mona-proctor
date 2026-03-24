import type {
  AppendHistoryRequest,
  AppendHistoryResponse,
  HistorySessionResponse,
} from './apiTypes'

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function appendSessionHistory(
  sessionId: string,
  request: AppendHistoryRequest,
) {
  const response = await fetch(`/api/history/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return parseJsonResponse<AppendHistoryResponse>(response)
}

export async function fetchSessionHistory(sessionId: string) {
  const response = await fetch(`/api/history/sessions/${sessionId}`)

  return parseJsonResponse<HistorySessionResponse>(response)
}
