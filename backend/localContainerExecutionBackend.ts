import { spawn } from 'node:child_process'
import type { ExecutionBackend, ExecutionBackendOptionsByLanguage, ExecutionDispatchResult } from './executionBackend.js'
import type { ExecutionRecord } from './executionTypes.js'

type LocalContainerExecutionBackendOptions = {
  addHostGateway: boolean
  dockerCommand: string
  firestoreEmulatorHost?: string
  images: ExecutionBackendOptionsByLanguage
  javaMaxMemoryMb: number
  javaMaxStderrBytes: number
  javaMaxStdoutBytes: number
  javaTimeoutMs: number
  maxStderrBytes: number
  maxStdoutBytes: number
  network?: string
  projectId: string
  timeoutMs: number
}

type CommandResult = {
  code: number
  stderr: string
  stdout: string
}

type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

function defaultCommandRunner(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      resolve({
        code: code ?? 1,
        stderr,
        stdout,
      })
    })
  })
}

function sanitizeContainerName(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-').slice(0, 120)
}

function normalizeEmulatorHost(value: string) {
  const host = value.trim()

  if (host.startsWith('127.0.0.1:') || host.startsWith('localhost:')) {
    return host.replace(/^(127\.0\.0\.1|localhost):/, 'host.docker.internal:')
  }

  return host
}

export class LocalContainerExecutionBackend implements ExecutionBackend {
  readonly name = 'local-container'

  constructor(
    private readonly options: LocalContainerExecutionBackendOptions,
    private readonly runCommand: CommandRunner = defaultCommandRunner,
  ) {}

  async dispatch(job: ExecutionRecord): Promise<ExecutionDispatchResult> {
    const containerName = sanitizeContainerName(`mona-proctor-exec-${job.jobId}`)
    const imageConfiguration = this.options.images[job.language]
    const args = [
      'run',
      '--detach',
      '--name',
      containerName,
    ]

    if (this.options.network) {
      args.push('--network', this.options.network)
    }

    if (this.options.addHostGateway) {
      args.push('--add-host', 'host.docker.internal:host-gateway')
    }

    args.push(
      '--env',
      `GCLOUD_PROJECT=${this.options.projectId}`,
      '--env',
      `EXECUTION_TIMEOUT_MS=${this.options.timeoutMs}`,
      '--env',
      `EXECUTION_MAX_STDOUT_BYTES=${this.options.maxStdoutBytes}`,
      '--env',
      `EXECUTION_MAX_STDERR_BYTES=${this.options.maxStderrBytes}`,
      '--env',
      `JAVA_EXECUTION_TIMEOUT_MS=${this.options.javaTimeoutMs}`,
      '--env',
      `JAVA_EXECUTION_MAX_STDOUT_BYTES=${this.options.javaMaxStdoutBytes}`,
      '--env',
      `JAVA_EXECUTION_MAX_STDERR_BYTES=${this.options.javaMaxStderrBytes}`,
      '--env',
      `JAVA_EXECUTION_MAX_MEMORY_MB=${this.options.javaMaxMemoryMb}`,
    )

    if (this.options.firestoreEmulatorHost) {
      args.push(
        '--env',
        `FIRESTORE_EMULATOR_HOST=${normalizeEmulatorHost(this.options.firestoreEmulatorHost)}`,
      )
    }

    args.push(imageConfiguration.backendJobNameOrImage)

    const result = await this.runCommand(this.options.dockerCommand, args).catch((error) => {
      throw new Error(`Local container dispatch failed: ${String(error)}`)
    })

    if (result.code !== 0) {
      throw new Error(`Local container dispatch failed: ${(result.stderr || result.stdout).trim()}`)
    }

    void result
    console.log(`Started local execution container ${containerName} for job ${job.jobId}.`)

    return {
      backendJobName: containerName,
    }
  }
}
