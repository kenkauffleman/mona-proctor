import { spawn, type ChildProcess } from 'node:child_process'
import process from 'node:process'
import { buildLocalExecutionRunnerImages, ensureDockerAvailable } from './executionLocalContainer.js'
import { ensureLocalAuthUser, localAuthUsers } from './authEmulatorUsers.js'

const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 4173)
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8081)
const pythonImageName = process.env.EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME ?? 'mona-proctor-python-runner-local'
const javaImageName = process.env.EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME ?? 'mona-proctor-java-runner-local'
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

const childProcesses: ChildProcess[] = []

function startProcess(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(command, args, {
    env,
    stdio: 'inherit',
  })

  childProcesses.push(child)
  child.once('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code
    }
  })

  return child
}

function shutdown() {
  for (const child of childProcesses) {
    child.kill('SIGTERM')
  }
}

async function main() {
  await ensureDockerAvailable()
  await buildLocalExecutionRunnerImages({ pythonImageName, javaImageName })

  for (const user of localAuthUsers) {
    await ensureLocalAuthUser(user)
  }

  startProcess('npx', ['tsx', '--no-cache', 'backend/index.ts'], {
    ...process.env,
    PORT: String(backendPort),
    GCLOUD_PROJECT: projectId,
    EXECUTION_BACKEND: 'local-container',
    EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: pythonImageName,
    EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: javaImageName,
  })

  startProcess('npx', ['vite', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'], {
    ...process.env,
  })

  console.log(`Local test stack starting on frontend http://127.0.0.1:${frontendPort} and backend http://127.0.0.1:${backendPort}`)
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

main().catch((error: unknown) => {
  console.error('Failed to start the local test stack.')
  console.error(error)
  shutdown()
  process.exit(1)
})
