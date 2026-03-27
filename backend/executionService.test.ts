import { describe, expect, it } from 'vitest'
import type { ExecutionBackend } from './executionBackend.js'
import { InMemoryExecutionRepository } from './inMemoryExecutionRepository.js'
import { ExecutionService } from './executionService.js'

function createService(backend: ExecutionBackend) {
  return new ExecutionService(
    new InMemoryExecutionRepository(),
    backend,
    {
      maxSourceBytes: 32,
      timeoutMs: 5_000,
      maxStdoutBytes: 256,
      maxStderrBytes: 256,
      globalActiveJobLimit: 2,
    },
  )
}

describe('execution service', () => {
  it('rejects empty source and oversized source', async () => {
    const service = createService({
      name: 'test-backend',
      async dispatch() {
        return { backendJobName: 'dispatch-1' }
      },
    })
    const owner = { uid: 'owner-1', email: 'owner@example.com' }

    await expect(service.submitExecution(owner, {
      language: 'python',
      source: '   ',
    })).rejects.toThrow('must not be empty')

    await expect(service.submitExecution(owner, {
      language: 'python',
      source: 'x'.repeat(40),
    })).rejects.toThrow('configured limit')
  })

  it('stores a terminal error result when dispatch fails', async () => {
    const service = createService({
      name: 'failing-backend',
      async dispatch() {
        throw new Error('backend unavailable')
      },
    })

    const job = await service.submitExecution(
      { uid: 'owner-1', email: 'owner@example.com' },
      {
        language: 'python',
        source: 'print("hello")',
      },
    )

    expect(job.status).toBe('error')
    expect(job.result).toEqual({
      status: 'error',
      stdout: '',
      stderr: 'backend unavailable',
      exitCode: null,
      durationMs: null,
      truncated: false,
    })
  })
})
