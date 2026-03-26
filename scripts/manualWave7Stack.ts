import net from 'node:net'
import process from 'node:process'
import { spawn, type ChildProcess } from 'node:child_process'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const emulatorHost = '127.0.0.1'
const emulatorPort = 8080
const emulatorUiPort = 4000
const backendHost = '127.0.0.1'
const backendPort = 8081
const clientHost = '127.0.0.1'
const clientPort = 5173
const backendImage = 'mona-proctor-backend-validation'
const backendContainerName = `mona-proctor-wave7-manual-${process.pid}`

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`))
    })
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

function startEmulator() {
  return spawn('npx', ['firebase', 'emulators:start', '--only', 'firestore'], {
    env: {
      ...process.env,
      GCLOUD_PROJECT: projectId,
    },
    stdio: 'inherit',
  })
}

function startBackendContainer() {
  return spawn('docker', [
    'run',
    '--rm',
    '--name',
    backendContainerName,
    '--add-host',
    'host.docker.internal:host-gateway',
    '--publish',
    `${backendPort}:${backendPort}`,
    '--env',
    `PORT=${backendPort}`,
    '--env',
    `GCLOUD_PROJECT=${projectId}`,
    '--env',
    `FIRESTORE_EMULATOR_HOST=host.docker.internal:${emulatorPort}`,
    backendImage,
  ], {
    env: process.env,
    stdio: 'inherit',
  })
}

function startClient() {
  return spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(clientPort), '--strictPort'], {
    env: process.env,
    stdio: 'inherit',
  })
}

async function stopContainer() {
  await new Promise<void>((resolve) => {
    const child = spawn('docker', ['rm', '-f', backendContainerName], {
      env: process.env,
      stdio: 'ignore',
    })

    child.once('error', () => resolve())
    child.once('exit', () => resolve())
  })
}

async function main() {
  process.env.GCLOUD_PROJECT = projectId
  process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:${emulatorPort}`

  const emulatorAlreadyRunning = await isPortOpen(emulatorHost, emulatorPort)
  const emulatorProcess: ChildProcess | null = emulatorAlreadyRunning ? null : startEmulator()
  let backendProcess: ChildProcess | null = null
  let clientProcess: ChildProcess | null = null
  let shuttingDown = false

  const shutdown = async () => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true

    clientProcess?.kill('SIGINT')
    backendProcess?.kill('SIGINT')
    await stopContainer()

    if (!emulatorAlreadyRunning) {
      emulatorProcess?.kill('SIGINT')
    }
  }

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0))
  })
  process.on('SIGTERM', () => {
    void shutdown().finally(() => process.exit(0))
  })

  try {
    if (emulatorAlreadyRunning) {
      console.log(`Reusing Firestore emulator at ${emulatorHost}:${emulatorPort}.`)
    } else {
      await waitForPort(emulatorHost, emulatorPort, 30_000)
      await waitForPort(emulatorHost, emulatorUiPort, 30_000)
    }

    console.log(`Building backend container image ${backendImage}...`)
    await runCommand('docker', ['build', '-f', 'backend/Dockerfile', '-t', backendImage, '.'])

    await stopContainer()
    backendProcess = startBackendContainer()
    await waitForPort(backendHost, backendPort, 30_000)

    clientProcess = startClient()
    await waitForPort(clientHost, clientPort, 30_000)

    console.log('')
    console.log('Wave 7 manual stack is ready.')
    console.log(`Client: http://${clientHost}:${clientPort}`)
    console.log(`Backend: http://${backendHost}:${backendPort}`)
    console.log(`Firestore emulator: http://${emulatorHost}:${emulatorPort}`)
    console.log(`Firestore UI: http://${emulatorHost}:${emulatorUiPort}/firestore`)
    console.log('')
    console.log('Manual test flow:')
    console.log('1. Open the client URL and type into the recording page.')
    console.log('2. Click "Open Replay Page" and load the same session UUID.')
    console.log('3. Verify the replayed editor reconstructs what you typed.')
    console.log('4. Inspect the session document and batch documents in the Firestore UI.')
    console.log('')
    console.log('Press Ctrl+C when you are done.')

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        backendProcess?.once('exit', (code, signal) => {
          if (shuttingDown || signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
            resolve()
            return
          }

          reject(new Error(`Backend container exited unexpectedly with code ${code}`))
        })
      }),
      new Promise<void>((resolve, reject) => {
        clientProcess?.once('exit', (code, signal) => {
          if (shuttingDown || signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
            resolve()
            return
          }

          reject(new Error(`Client exited unexpectedly with code ${code}`))
        })
      }),
      emulatorAlreadyRunning
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
          emulatorProcess?.once('exit', (code, signal) => {
            if (shuttingDown || signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
              resolve()
              return
            }

            reject(new Error(`Firestore emulator exited unexpectedly with code ${code}`))
          })
        }),
    ])
  } catch (error) {
    await shutdown()
    throw error
  }
}

main().catch((error: unknown) => {
  console.error('Wave 7 manual stack failed.')
  console.error(error)
  process.exit(1)
})
