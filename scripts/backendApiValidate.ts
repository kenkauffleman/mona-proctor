import { spawn } from 'node:child_process'
import process from 'node:process'

const port = 18081
const host = '127.0.0.1'
const baseUrl = `http://${host}:${port}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHealthcheck(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (response.ok) {
        return
      }
    } catch {
      // Retry until the backend starts listening.
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for backend at ${baseUrl}`)
}

async function main() {
  const backendProcess = spawn(
    'npx',
    ['tsx', 'backend/index.ts'],
    {
      env: {
        ...process.env,
        PORT: String(port),
        GCLOUD_PROJECT: projectId,
      },
      stdio: 'inherit',
    },
  )

  try {
    await waitForHealthcheck(30_000)

    const runId = `wave-6-${Date.now()}`
    const response = await fetch(`${baseUrl}/api/firestore/validation`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        runId,
        note: 'Wave 6 local backend API seam validation.',
      }),
    })

    const body = await response.json() as {
      ok: boolean
      documentId?: string
      payload?: {
        note?: string
        projectId?: string
        runId?: string
        runtime?: string
      }
      error?: string
    }

    if (!response.ok || !body.ok) {
      throw new Error(
        `Validation endpoint returned ${response.status}: ${body.error ?? JSON.stringify(body)}`,
      )
    }

    if (body.documentId !== runId || body.payload?.runId !== runId) {
      throw new Error(`Validation response did not preserve the requested runId: ${JSON.stringify(body)}`)
    }

    if (body.payload?.runtime !== 'backend-api') {
      throw new Error(`Unexpected runtime in validation response: ${JSON.stringify(body)}`)
    }

    console.log(
      `Backend API seam validation succeeded for ${body.payload?.projectId} with run ${body.payload?.runId}.`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Backend API seam validation failed.')
  console.error(error)
  process.exit(1)
})
