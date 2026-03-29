import { describe, expect, it, vi } from 'vitest'
import { LocalContainerExecutionBackend } from './localContainerExecutionBackend.js'

describe('LocalContainerExecutionBackend', () => {
  it('starts the configured runner image with emulator and execution limit settings', async () => {
    const runCommand = vi.fn().mockResolvedValue({
      code: 0,
      stderr: '',
      stdout: 'container-123\n',
    })
    const backend = new LocalContainerExecutionBackend({
      addHostGateway: true,
      dockerCommand: 'docker',
      firestoreEmulatorHost: '127.0.0.1:8080',
      images: {
        python: { backendJobNameOrImage: 'mona-proctor-python-runner-local' },
        java: { backendJobNameOrImage: 'mona-proctor-java-runner-local' },
      },
      javaMaxMemoryMb: 128,
      javaMaxStderrBytes: 4096,
      javaMaxStdoutBytes: 2048,
      javaTimeoutMs: 6000,
      maxStderrBytes: 1024,
      maxStdoutBytes: 2048,
      projectId: 'demo-mona-proctor',
      timeoutMs: 5000,
    }, runCommand)

    const result = await backend.dispatch({
      jobId: 'exec-123',
      ownerUid: 'student-1',
      language: 'python',
      source: 'print("hello")',
      sourceSizeBytes: 14,
      status: 'queued',
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z',
      startedAt: null,
      completedAt: null,
      backend: 'local-container',
      backendJobName: null,
      errorMessage: null,
      result: null,
    })

    expect(runCommand).toHaveBeenCalledWith('docker', [
      'run',
      '--detach',
      '--name',
      'mona-proctor-exec-exec-123',
      '--add-host',
      'host.docker.internal:host-gateway',
      '--env',
      'GCLOUD_PROJECT=demo-mona-proctor',
      '--env',
      'EXECUTION_TIMEOUT_MS=5000',
      '--env',
      'EXECUTION_MAX_STDOUT_BYTES=2048',
      '--env',
      'EXECUTION_MAX_STDERR_BYTES=1024',
      '--env',
      'JAVA_EXECUTION_TIMEOUT_MS=6000',
      '--env',
      'JAVA_EXECUTION_MAX_STDOUT_BYTES=2048',
      '--env',
      'JAVA_EXECUTION_MAX_STDERR_BYTES=4096',
      '--env',
      'JAVA_EXECUTION_MAX_MEMORY_MB=128',
      '--env',
      'FIRESTORE_EMULATOR_HOST=host.docker.internal:8080',
      'mona-proctor-python-runner-local',
    ])
    expect(result).toEqual({
      backendJobName: 'mona-proctor-exec-exec-123',
    })
  })

  it('surfaces docker dispatch errors with stderr details', async () => {
    const backend = new LocalContainerExecutionBackend({
      addHostGateway: false,
      dockerCommand: 'docker',
      images: {
        python: { backendJobNameOrImage: 'runner-image' },
        java: { backendJobNameOrImage: 'runner-image-java' },
      },
      javaMaxMemoryMb: 128,
      javaMaxStderrBytes: 4096,
      javaMaxStdoutBytes: 2048,
      javaTimeoutMs: 6000,
      maxStderrBytes: 1024,
      maxStdoutBytes: 1024,
      projectId: 'demo-mona-proctor',
      timeoutMs: 5000,
    }, vi.fn().mockResolvedValue({
      code: 1,
      stderr: 'missing image',
      stdout: '',
    }))

    await expect(backend.dispatch({
      jobId: 'exec-456',
      ownerUid: 'student-1',
      language: 'python',
      source: 'print("hello")',
      sourceSizeBytes: 14,
      status: 'queued',
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z',
      startedAt: null,
      completedAt: null,
      backend: 'local-container',
      backendJobName: null,
      errorMessage: null,
      result: null,
    })).rejects.toThrow('Local container dispatch failed: missing image')
  })

  it('selects the Java runner image for Java jobs', async () => {
    const runCommand = vi.fn().mockResolvedValue({
      code: 0,
      stderr: '',
      stdout: 'container-456\n',
    })
    const backend = new LocalContainerExecutionBackend({
      addHostGateway: false,
      dockerCommand: 'docker',
      images: {
        python: { backendJobNameOrImage: 'mona-proctor-python-runner-local' },
        java: { backendJobNameOrImage: 'mona-proctor-java-runner-local' },
      },
      javaMaxMemoryMb: 128,
      javaMaxStderrBytes: 4096,
      javaMaxStdoutBytes: 2048,
      javaTimeoutMs: 6000,
      maxStderrBytes: 1024,
      maxStdoutBytes: 1024,
      projectId: 'demo-mona-proctor',
      timeoutMs: 5000,
    }, runCommand)

    await backend.dispatch({
      jobId: 'exec-java-123',
      ownerUid: 'student-1',
      language: 'java',
      source: 'public class Main { public static void main(String[] args) {} }',
      sourceSizeBytes: 62,
      status: 'queued',
      createdAt: '2026-03-28T00:00:00.000Z',
      updatedAt: '2026-03-28T00:00:00.000Z',
      startedAt: null,
      completedAt: null,
      backend: 'local-container',
      backendJobName: null,
      errorMessage: null,
      result: null,
    })

    expect(runCommand).toHaveBeenCalledWith('docker', expect.arrayContaining([
      'mona-proctor-java-runner-local',
    ]))
  })
})
