import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { buildLocalJavaRunnerImage, ensureDockerAvailable, runCommand } from './executionLocalContainer.js'

const imageName = 'mona-proctor-java-runner-validation'
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'

type SeededJob = {
  expectedStatus: 'succeeded' | 'failed'
  jobId: string
  source: string
  validateResult: (document: {
    status?: string
    result?: {
      stdout?: string
      stderr?: string
      exitCode?: number | null
      durationMs?: number | null
      truncated?: boolean
    } | null
  }) => void
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function stopContainer(containerName: string) {
  await runCommand('docker', ['rm', '-f', containerName], { capture: true }).catch(() => undefined)
}

async function printContainerLogs(containerName: string) {
  const logs = await runCommand('docker', ['logs', containerName], { capture: true }).catch(() => undefined)

  if (!logs) {
    return
  }

  const output = `${logs.stdout}${logs.stderr}`.trim()

  if (output.length > 0) {
    console.log(`Java runner logs for ${containerName}:`)
    console.log(output)
  }
}

async function waitForJobCompletion(firestore: Firestore, jobId: string, timeoutMs: number) {
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

async function seedQueuedJavaExecution(firestore: Firestore, job: SeededJob) {
  const createdAt = new Date().toISOString()
  const ownerUid = `local-validator-${job.jobId}`

  await firestore.collection('executionJobs').doc(job.jobId).set({
    jobId: job.jobId,
    ownerUid,
    language: 'java',
    source: job.source,
    sourceSizeBytes: new TextEncoder().encode(job.source).length,
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
  await firestore.collection('executionQueue').doc(job.jobId).set({
    jobId: job.jobId,
    createdAt,
  })
  await firestore.collection('executionActiveUsers').doc(ownerUid).set({
    jobId: job.jobId,
    ownerUid,
    updatedAt: createdAt,
  })
  await firestore.collection('executionSystem').doc('stats').set({
    activeJobCount: 1,
    updatedAt: createdAt,
  })
}

async function runSeededValidation(firestore: Firestore, job: SeededJob, index: number) {
  const containerName = `mona-proctor-java-runner-validation-${process.pid}-${index}`
  await seedQueuedJavaExecution(firestore, job)
  await stopContainer(containerName)

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
    'JAVA_EXECUTION_TIMEOUT_MS=6000',
    '--env',
    'JAVA_EXECUTION_MAX_STDOUT_BYTES=2048',
    '--env',
    'JAVA_EXECUTION_MAX_STDERR_BYTES=4096',
    '--env',
    'JAVA_EXECUTION_MAX_MEMORY_MB=128',
    imageName,
  ], { capture: true })

  if (runResult.code !== 0) {
    throw new Error(`Java runner container failed to start for ${job.jobId}.\n${runResult.stderr || runResult.stdout}`)
  }

  try {
    const completedJob = await waitForJobCompletion(firestore, job.jobId, 30_000)

    if (completedJob.status !== job.expectedStatus) {
      throw new Error(`Expected ${job.expectedStatus} for ${job.jobId} but received ${JSON.stringify(completedJob)}`)
    }

    job.validateResult(completedJob)
  } finally {
    await printContainerLogs(containerName)
    await stopContainer(containerName)
  }
}

async function main() {
  await ensureDockerAvailable()
  console.log(`Building Java runner image ${imageName}...`)
  await buildLocalJavaRunnerImage(imageName)

  const firestore = new Firestore({ projectId })
  const jobs: SeededJob[] = [
    {
      jobId: `exec-${Date.now()}-java-success`,
      expectedStatus: 'succeeded',
      source: `public class Main {
  public static void main(String[] args) {
    System.out.println("hello from java runner");
  }
}
`,
      validateResult(document) {
        if (document.result?.stdout?.trim() !== 'hello from java runner') {
          throw new Error(`Unexpected Java stdout payload: ${JSON.stringify(document.result)}`)
        }

        if (document.result.stderr !== '') {
          throw new Error(`Expected empty Java stderr but received ${JSON.stringify(document.result)}`)
        }

        if (document.result.exitCode !== 0) {
          throw new Error(`Expected Java exitCode 0 but received ${JSON.stringify(document.result)}`)
        }
      },
    },
    {
      jobId: `exec-${Date.now()}-java-compile-fail`,
      expectedStatus: 'failed',
      source: `public class Main {
  public static void main(String[] args) {
    System.out.println("compile fail")
  }
}
`,
      validateResult(document) {
        if ((document.result?.stderr ?? '').length === 0) {
          throw new Error(`Expected compile stderr for Java failure but received ${JSON.stringify(document.result)}`)
        }

        if (document.result?.exitCode !== 1) {
          throw new Error(`Expected Java compile failure exitCode 1 but received ${JSON.stringify(document.result)}`)
        }
      },
    },
  ]

  for (const [index, job] of jobs.entries()) {
    await runSeededValidation(firestore, job, index)
  }

  console.log('Java execution container validation succeeded for compile success and compile failure cases.')
}

main().catch((error: unknown) => {
  console.error('Java execution container validation failed.')
  console.error(error)
  process.exit(1)
})
