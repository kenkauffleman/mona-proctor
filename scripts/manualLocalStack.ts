import net from 'node:net'
import process from 'node:process'
import { spawn, type ChildProcess } from 'node:child_process'
import { ensureLocalAuthUser, localAuthUsers } from './authEmulatorUsers.js'
import { buildLocalPythonRunnerImage, ensureDockerAvailable } from './executionLocalContainer.js'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const firestoreHost = '127.0.0.1'
const firestorePort = 8080
const authHost = '127.0.0.1'
const authPort = 9099
const emulatorUiHost = '127.0.0.1'
const emulatorUiPort = 4000
const backendHost = '127.0.0.1'
const backendPort = 8081
const frontendHost = '127.0.0.1'
const frontendPort = 5173
const imageName = process.env.EXECUTION_LOCAL_CONTAINER_IMAGE_NAME ?? 'mona-proctor-python-runner-local'

function startProcess(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawn(command, args, {
    env,
    stdio: 'inherit',
  })
}

function isPortOpen(host: string, port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port })

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function waitForPort(host: string, port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await isPortOpen(host, port)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for ${host}:${port}`)
}

async function seedAuthUsers() {
  for (const user of localAuthUsers) {
    await ensureLocalAuthUser(user)
  }

  console.log(`Seeded ${localAuthUsers.length} local Auth emulator users.`)
}

async function main() {
  process.env.GCLOUD_PROJECT = projectId

  if (await isPortOpen(firestoreHost, firestorePort) || await isPortOpen(authHost, authPort)) {
    throw new Error(
      `Expected local emulator ports ${firestorePort} and ${authPort} to be free before starting the manual stack.`,
    )
  }

  await ensureDockerAvailable()
  await buildLocalPythonRunnerImage(imageName)

  const childProcesses: ChildProcess[] = []
  let shuttingDown = false

  const shutdown = () => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true

    while (childProcesses.length > 0) {
      childProcesses.pop()?.kill('SIGTERM')
    }
  }

  process.on('SIGINT', () => {
    shutdown()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    shutdown()
    process.exit(0)
  })

  try {
    const emulatorProcess = startProcess(
      'npx',
      ['firebase', 'emulators:start', '--only', 'firestore,auth'],
      {
        ...process.env,
        GCLOUD_PROJECT: projectId,
      },
    )
    childProcesses.push(emulatorProcess)

    await waitForPort(firestoreHost, firestorePort, 30_000)
    await waitForPort(authHost, authPort, 30_000)
    await waitForPort(emulatorUiHost, emulatorUiPort, 30_000)

    await seedAuthUsers()

    const backendProcess = startProcess(
      'npx',
      ['tsx', '--no-cache', 'backend/index.ts'],
      {
        ...process.env,
        PORT: String(backendPort),
        GCLOUD_PROJECT: projectId,
        FIRESTORE_EMULATOR_HOST: `${firestoreHost}:${firestorePort}`,
        FIREBASE_AUTH_EMULATOR_HOST: `${authHost}:${authPort}`,
        EXECUTION_BACKEND: 'local-container',
        EXECUTION_LOCAL_CONTAINER_IMAGE_NAME: imageName,
      },
    )
    childProcesses.push(backendProcess)

    await waitForPort(backendHost, backendPort, 30_000)

    const frontendProcess = startProcess(
      'npx',
      ['vite', '--host', '0.0.0.0', '--port', String(frontendPort), '--strictPort'],
      {
        ...process.env,
      },
    )
    childProcesses.push(frontendProcess)

    await waitForPort(frontendHost, frontendPort, 30_000)

    console.log('')
    console.log('Local manual validation stack is ready.')
    console.log(`Frontend: http://${frontendHost}:${frontendPort}`)
    console.log(`Backend: http://${backendHost}:${backendPort}`)
    console.log(`Firestore emulator: http://${firestoreHost}:${firestorePort}`)
    console.log(`Auth emulator: http://${authHost}:${authPort}`)
    console.log(`Emulator UI: http://${emulatorUiHost}:${emulatorUiPort}`)
    console.log('')
    console.log('Default local users:')
    for (const user of localAuthUsers) {
      console.log(`- ${user.email} / ${user.password}`)
    }
    console.log('')
    console.log('Suggested manual flow:')
    console.log('1. Open the frontend URL and sign in with a seeded local user.')
    console.log('2. Type in the editor and confirm history sync status updates.')
    console.log('3. Click "Run Python" and confirm the latest execution result renders.')
    console.log('4. Open the replay page for the current session UUID and confirm it reconstructs the source.')
    console.log('5. Inspect Firestore/Auth state in the Emulator UI if needed.')
    console.log('')
    console.log('Press Ctrl+C when you are done.')

    await Promise.all(childProcesses.map((child) => new Promise<void>((resolve, reject) => {
      child.once('exit', (code, signal) => {
        if (shuttingDown || signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
          resolve()
          return
        }

        reject(new Error(`Process exited unexpectedly with code ${code ?? 'unknown'}`))
      })
    })))
  } catch (error) {
    shutdown()
    throw error
  }
}

main().catch((error: unknown) => {
  console.error('Failed to start the local manual validation stack.')
  console.error(error)
  process.exit(1)
})
