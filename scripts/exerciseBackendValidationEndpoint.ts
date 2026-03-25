import process from 'node:process'

type ValidationResponse = {
  ok: boolean
  collection?: string
  documentId?: string
  payload?: {
    checkedAt?: string
    emulatorHost?: string
    note?: string
    projectId?: string
    runId?: string
    runtime?: string
  }
  error?: string
}

async function main() {
  const baseUrl = process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8081'
  const runId = process.env.VALIDATION_RUN_ID ?? `manual-${Date.now()}`
  const note = process.env.VALIDATION_NOTE ?? 'Manual backend API seam validation.'

  const response = await fetch(`${baseUrl}/api/firestore/validation`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      runId,
      note,
    }),
  })

  const body = await response.json() as ValidationResponse

  if (!response.ok || !body.ok) {
    throw new Error(
      `Validation request failed with ${response.status}: ${body.error ?? JSON.stringify(body)}`,
    )
  }

  console.log(JSON.stringify(body, null, 2))
}

main().catch((error: unknown) => {
  console.error('Backend API seam exercise failed.')
  console.error(error)
  process.exit(1)
})
