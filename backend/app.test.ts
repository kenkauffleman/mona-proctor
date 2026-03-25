import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBackendApp,
  type FirestoreValidationResponse,
  type ValidationService,
} from './app.js'

const servers: Array<{ close: () => void }> = []

afterEach(() => {
  while (servers.length > 0) {
    servers.pop()?.close()
  }
})

async function startTestServer(validationService: ValidationService) {
  const app = createBackendApp(validationService, {
    projectId: 'demo-mona-proctor',
    firestoreEmulatorHost: '127.0.0.1:8080',
  })

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  servers.push(server)

  return {
    baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  }
}

function createValidationResponse(): FirestoreValidationResponse {
  return {
    collection: 'backendApiValidationRuns',
    documentId: 'wave-6-smoke-test',
    payload: {
      checkedAt: '2026-03-25T00:00:00.000Z',
      emulatorHost: '127.0.0.1:8080',
      note: 'wave 6 smoke test',
      projectId: 'demo-mona-proctor',
      runId: 'wave-6-smoke-test',
      runtime: 'backend-api',
    },
  }
}

describe('backend validation app', () => {
  it('reports health metadata for the container-friendly runtime', async () => {
    const { baseUrl } = await startTestServer({
      writeAndReadValidation: vi.fn().mockResolvedValue(createValidationResponse()),
    })

    const response = await fetch(`${baseUrl}/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      projectId: 'demo-mona-proctor',
      firestoreEmulatorHost: '127.0.0.1:8080',
    })
  })

  it('triggers a Firestore write/read validation through the injected service', async () => {
    const validationService = {
      writeAndReadValidation: vi.fn().mockResolvedValue(createValidationResponse()),
    }
    const { baseUrl } = await startTestServer(validationService)

    const response = await fetch(`${baseUrl}/api/firestore/validation`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        runId: 'wave-6-smoke-test',
        note: 'wave 6 smoke test',
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      ok: true,
      ...createValidationResponse(),
    })
    expect(validationService.writeAndReadValidation).toHaveBeenCalledWith(
      {
        runId: 'wave-6-smoke-test',
        note: 'wave 6 smoke test',
      },
      '127.0.0.1:8080',
    )
  })

  it('returns a 500 response when Firestore validation fails', async () => {
    const { baseUrl } = await startTestServer({
      writeAndReadValidation: vi.fn().mockRejectedValue(new Error('emulator unavailable')),
    })

    const response = await fetch(`${baseUrl}/api/firestore/validation`, {
      method: 'POST',
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'emulator unavailable',
    })
  })

  it('returns a 400 response for an invalid validation request body', async () => {
    const validationService = {
      writeAndReadValidation: vi.fn(),
    }
    const { baseUrl } = await startTestServer(validationService)

    const response = await fetch(`${baseUrl}/api/firestore/validation`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        runId: '',
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      ok: false,
      error: 'runId must be a non-empty string when provided.',
    })
    expect(validationService.writeAndReadValidation).not.toHaveBeenCalled()
  })
})
