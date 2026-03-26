import { spawn } from 'node:child_process'
import process from 'node:process'

const imageName = 'mona-proctor-backend-validation'
const containerName = `mona-proctor-backend-validation-${process.pid}`
const containerPort = 8081
const hostPort = 18081
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

function runCommand(command: string, args: string[], options: { capture?: boolean } = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: options.capture ? 'pipe' : 'inherit',
    })

    let stdout = ''
    let stderr = ''

    if (options.capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
    }

    child.once('error', reject)
    child.once('exit', (code) => {
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

async function ensureDockerAvailable() {
  const result = await runCommand('docker', ['--version'], { capture: true }).catch((error) => {
    throw new Error(`Docker is required for backend container validation: ${String(error)}`)
  })

  if (result.code !== 0) {
    throw new Error(`Docker is required for backend container validation.\n${result.stderr || result.stdout}`)
  }
}

async function waitForHealthcheck(baseUrl: string, timeoutMs: number) {
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

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for backend container at ${baseUrl}`)
}

async function stopContainer() {
  await runCommand('docker', ['rm', '-f', containerName], { capture: true }).catch(() => undefined)
}

async function main() {
  await ensureDockerAvailable()

  const buildResult = await runCommand('docker', [
    'build',
    '-f',
    'backend/Dockerfile',
    '-t',
    imageName,
    '.',
  ])

  if (buildResult.code !== 0) {
    throw new Error('Backend container image build failed.')
  }

  await stopContainer()

  const runResult = await runCommand('docker', [
    'run',
    '--rm',
    '--detach',
    '--name',
    containerName,
    '--add-host',
    'host.docker.internal:host-gateway',
    '--publish',
    `${hostPort}:${containerPort}`,
    '--env',
    `PORT=${containerPort}`,
    '--env',
    `GCLOUD_PROJECT=${projectId}`,
    '--env',
    'FIRESTORE_EMULATOR_HOST=host.docker.internal:8080',
    imageName,
  ], { capture: true })

  if (runResult.code !== 0) {
    throw new Error(`Backend container failed to start.\n${runResult.stderr || runResult.stdout}`)
  }

  const baseUrl = `http://127.0.0.1:${hostPort}`

  try {
    await waitForHealthcheck(baseUrl, 30_000)
    const response = await fetch(`${baseUrl}/api/history/sessions/container-smoke/batches`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        batchSequence: 1,
        eventOffset: 0,
        events: [{
          sequence: 1,
          timestamp: Date.now(),
          versionId: 1,
          isUndoing: false,
          isRedoing: false,
          isFlush: false,
          isEolChange: false,
          eol: '\n',
          changes: [],
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`History endpoint returned ${response.status}: ${await response.text()}`)
    }

    console.log(
      `Backend container history validation succeeded with ${JSON.stringify(await response.json())}.`,
    )
  } finally {
    await stopContainer()
  }
}

main().catch((error: unknown) => {
  console.error('Backend container validation failed.')
  console.error(error)
  process.exit(1)
})
