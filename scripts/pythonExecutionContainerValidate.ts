import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { buildLocalPythonRunnerImage, ensureDockerAvailable, runCommand } from './executionLocalContainer.js'

const imageName = 'mona-proctor-python-runner-validation'
const containerName = `mona-proctor-python-runner-validation-${process.pid}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const jobId = `exec-${Date.now()}-local-validate`

async function stopContainer() {
  await runCommand('docker', ['rm', '-f', containerName], { capture: true }).catch(() => undefined)
}

async function printContainerLogs() {
  const logs = await runCommand('docker', ['logs', containerName], { capture: true }).catch(() => undefined)

  if (!logs) {
    return
  }

  const output = `${logs.stdout}${logs.stderr}`.trim()

  if (output.length > 0) {
    console.log('Python runner container logs:')
    console.log(output)
  }
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForJobCompletion(firestore: Firestore, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const snapshot = await firestore.collection('executionJobs').doc(jobId).get()
    const document = snapshot.data() as {
      status?: string
      result?: {
        stdout?: string
        stderr?: string
        exitCode?: number | null
        durationMs?: number | null
        truncated?: boolean
      } | null
    } | undefined

    if (document?.status && ['succeeded', 'failed', 'timed_out', 'error'].includes(document.status)) {
      return document
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for execution job ${jobId} to complete.`)
}

async function seedQueuedExecution(firestore: Firestore) {
  const createdAt = new Date().toISOString()

  await firestore.collection('executionJobs').doc(jobId).set({
    jobId,
    ownerUid: 'local-validator',
    language: 'python',
    source: 'print("hello from python runner")',
    sourceSizeBytes: 33,
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    completedAt: null,
    backend: 'cloud-run-job',
    backendJobName: null,
    errorMessage: null,
    result: null,
  })
  await firestore.collection('executionQueue').doc(jobId).set({
    jobId,
    createdAt,
  })
  await firestore.collection('executionActiveUsers').doc('local-validator').set({
    jobId,
    ownerUid: 'local-validator',
    updatedAt: createdAt,
  })
  await firestore.collection('executionSystem').doc('stats').set({
    activeJobCount: 1,
    updatedAt: createdAt,
  })
}

async function main() {
  await ensureDockerAvailable()

  const firestore = new Firestore({ projectId })
  await seedQueuedExecution(firestore)

  console.log(`Building Python runner image ${imageName}...`)
  await buildLocalPythonRunnerImage(imageName)

  await stopContainer()

  console.log(`Starting Python runner container ${containerName}...`)
  const runResult = await runCommand('docker', [
    'run',
    '--detach',
    '--name',
    containerName,
    '--add-host',
    'host.docker.internal:host-gateway',
    '--env',
    `GCLOUD_PROJECT=${projectId}`,
    '--env',
    'FIRESTORE_EMULATOR_HOST=host.docker.internal:8080',
    '--env',
    'EXECUTION_TIMEOUT_MS=5000',
    '--env',
    'EXECUTION_MAX_STDOUT_BYTES=1024',
    '--env',
    'EXECUTION_MAX_STDERR_BYTES=1024',
    imageName,
  ], { capture: true })

  if (runResult.code !== 0) {
    throw new Error(`Python runner container failed to start.\n${runResult.stderr || runResult.stdout}`)
  }

  try {
    const completedJob = await waitForJobCompletion(firestore, 30_000)

    if (completedJob.status !== 'succeeded') {
      throw new Error(`Expected execution success but received ${JSON.stringify(completedJob)}`)
    }

    if (completedJob.result?.stdout?.trim() !== 'hello from python runner') {
      throw new Error(`Unexpected stdout payload: ${JSON.stringify(completedJob.result)}`)
    }

    if (completedJob.result.stderr !== '') {
      throw new Error(`Expected empty stderr but received ${JSON.stringify(completedJob.result)}`)
    }

    if (completedJob.result.exitCode !== 0) {
      throw new Error(`Expected exitCode 0 but received ${JSON.stringify(completedJob.result)}`)
    }

    console.log(`Python execution container validation succeeded for ${jobId}.`)
  } finally {
    await printContainerLogs()
    await stopContainer()
  }
}

main().catch((error: unknown) => {
  console.error('Python execution container validation failed.')
  console.error(error)
  process.exit(1)
})
