import net from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import { runFirestoreSanityCheck } from './firestoreEmulatorSanity'

const emulatorHost = '127.0.0.1'
const emulatorPort = 8080
const uiUrl = 'http://127.0.0.1:4000/firestore'
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

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

function waitForPort(host: string, port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port })

      socket.once('connect', () => {
        socket.end()
        resolve()
      })

      socket.once('error', () => {
        socket.destroy()

        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${host}:${port}`))
          return
        }

        setTimeout(attempt, 250)
      })
    }

    attempt()
  })
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

async function main() {
  process.env.GCLOUD_PROJECT = projectId
  process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:${emulatorPort}`

  const emulatorAlreadyRunning = await isPortOpen(emulatorHost, emulatorPort)
  const emulatorProcess: ChildProcess | null = emulatorAlreadyRunning ? null : startEmulator()

  if (emulatorAlreadyRunning) {
    console.log(`Reusing running Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}.`)
  } else {
    const shutdown = () => {
      emulatorProcess?.kill('SIGINT')
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    emulatorProcess?.once('exit', (code, signal) => {
      if (signal === 'SIGINT' || signal === 'SIGTERM') {
        process.exit(0)
      }

      if (typeof code === 'number' && code !== 0) {
        process.exit(code)
      }
    })
  }

  await waitForPort(emulatorHost, emulatorPort, 30_000)

  const result = await runFirestoreSanityCheck()

  console.log('Firestore emulator manual check fetched document:')
  console.log(JSON.stringify(result.fetched, null, 2))
  console.log(`Emulator UI is available at ${uiUrl}`)

  if (emulatorAlreadyRunning) {
    console.log('The emulator was already running, so this command will now exit and leave it up.')
    return
  }

  console.log('Press Ctrl+C when you are done inspecting the record.')

  await new Promise<void>((resolve, reject) => {
    emulatorProcess?.once('exit', (code, signal) => {
      if (signal === 'SIGINT' || signal === 'SIGTERM' || code === 0) {
        resolve()
        return
      }

      reject(new Error(`Firestore emulator exited unexpectedly with code ${code}`))
    })
  })
}

main().catch((error: unknown) => {
  console.error('Firestore emulator manual check failed.')
  console.error(error)
  process.exit(1)
})
