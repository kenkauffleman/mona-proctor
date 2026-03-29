import { spawn } from 'node:child_process'
import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { ensureLocalAuthUser, localAuthUsers, signInLocalAuthUser } from './authEmulatorUsers.js'
import { buildLocalJavaRunnerImage, ensureDockerAvailable, runCommand } from './executionLocalContainer.js'

const port = 18181 + (process.pid % 1000)
const host = '127.0.0.1'
const baseUrl = `http://${host}:${port}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const javaImageName = 'mona-proctor-java-runner-local'

type LoadedExecutionJob = {
  job: {
    jobId: string
    ownerUid: string
    backendJobName?: string | null
    result: {
      status: string
      stdout: string
      stderr: string
      exitCode: number | null
      durationMs: number | null
      truncated: boolean
    } | null
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHealthcheck(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)

      if (response.ok) {
        const body = await response.json() as { executionBackend?: string }

        if (body.executionBackend === 'local-container') {
          return
        }
      }
    } catch {
      // Retry until the backend starts listening.
    }

    await wait(250)
  }

  throw new Error(`Timed out waiting for backend at ${baseUrl}`)
}

async function waitForTerminalJob(jobId: string, idToken: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const loadResponse = await fetch(`${baseUrl}/api/execution/jobs/${jobId}`, {
      headers: {
        authorization: `Bearer ${idToken}`,
      },
    })

    if (!loadResponse.ok) {
      throw new Error(`Execution load failed with ${loadResponse.status}: ${await loadResponse.text()}`)
    }

    const loadedJob = await loadResponse.json() as LoadedExecutionJob

    if (loadedJob.job.result) {
      return loadedJob
    }

    await wait(500)
  }

  throw new Error(`Timed out waiting for execution result for ${jobId}`)
}

async function main() {
  await ensureDockerAvailable()
  await buildLocalJavaRunnerImage(javaImageName)

  const backendProcess = spawn(
    'npx',
    ['tsx', '--no-cache', 'backend/index.ts'],
    {
      env: {
        ...process.env,
        EXECUTION_BACKEND: 'local-container',
        EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: 'mona-proctor-python-runner-local',
        EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: javaImageName,
        PORT: String(port),
        GCLOUD_PROJECT: projectId,
      },
      stdio: 'inherit',
    },
  )

  try {
    await waitForHealthcheck(30_000)

    for (const user of localAuthUsers) {
      await ensureLocalAuthUser(user)
    }

    const firstUser = await signInLocalAuthUser(localAuthUsers[0]!)
    const secondUser = await signInLocalAuthUser(localAuthUsers[1]!)

    const successSubmitResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'java',
        source: `public class Main {
  public static void main(String[] args) {
    System.out.println("wave17 java");
  }
}
`,
      }),
    })

    if (!successSubmitResponse.ok) {
      throw new Error(`Java execution submit failed with ${successSubmitResponse.status}: ${await successSubmitResponse.text()}`)
    }

    const createdSuccessJob = await successSubmitResponse.json() as { job: { jobId: string; ownerUid: string } }

    if (createdSuccessJob.job.ownerUid !== firstUser.localId) {
      throw new Error(`Expected owner uid ${firstUser.localId} but received ${createdSuccessJob.job.ownerUid}`)
    }

    const loadedSuccessJob = await waitForTerminalJob(createdSuccessJob.job.jobId, firstUser.idToken, 30_000)

    if (
      loadedSuccessJob.job.result?.status != 'succeeded'
      || loadedSuccessJob.job.result.stdout !== 'wave17 java\n'
      || loadedSuccessJob.job.result.exitCode !== 0
      || loadedSuccessJob.job.result.truncated !== false
    ) {
      throw new Error(`Unexpected loaded Java success payload: ${JSON.stringify(loadedSuccessJob)}`)
    }

    const compileFailureSubmitResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'java',
        source: `public class Main {
  public static void main(String[] args) {
    System.out.println("missing semicolon")
  }
}
`,
      }),
    })

    if (!compileFailureSubmitResponse.ok) {
      throw new Error(`Java compile-failure submit failed with ${compileFailureSubmitResponse.status}: ${await compileFailureSubmitResponse.text()}`)
    }

    const createdFailureJob = await compileFailureSubmitResponse.json() as { job: { jobId: string } }
    const loadedFailureJob = await waitForTerminalJob(createdFailureJob.job.jobId, firstUser.idToken, 30_000)

    if (
      loadedFailureJob.job.result?.status !== 'failed'
      || loadedFailureJob.job.result.exitCode !== 1
      || !loadedFailureJob.job.result.stderr.includes('error:')
    ) {
      throw new Error(`Unexpected loaded Java compile-failure payload: ${JSON.stringify(loadedFailureJob)}`)
    }

    const forbiddenResponse = await fetch(`${baseUrl}/api/execution/jobs/${createdFailureJob.job.jobId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    if (forbiddenResponse.status !== 403) {
      throw new Error(`Expected second user Java execution access to fail with 403 but received ${forbiddenResponse.status}`)
    }

    const firestore = new Firestore({ projectId })
    const snapshot = await firestore.collection('executionJobs').doc(createdFailureJob.job.jobId).get()
    const document = snapshot.data() as { ownerUid?: string; result?: { status?: string } } | undefined

    if (!snapshot.exists || document?.ownerUid !== firstUser.localId || document.result?.status !== 'failed') {
      throw new Error(`Expected stored Java execution record for ${createdFailureJob.job.jobId} but found ${JSON.stringify(document)}`)
    }

    for (const job of [loadedSuccessJob.job, loadedFailureJob.job]) {
      if (job.backendJobName) {
        const logs = await runCommand('docker', ['logs', job.backendJobName], { capture: true }).catch(() => null)

        if (!logs || (!logs.stdout.includes('Completed execution job') && !logs.stderr.includes('Completed execution job'))) {
          throw new Error(`Expected local runner logs for ${job.backendJobName} but could not confirm completion.`)
        }

        await runCommand('docker', ['rm', '-f', job.backendJobName], { capture: true }).catch(() => undefined)
      }
    }

    console.log(
      `Wave 17 local Java execution validation succeeded for ${createdSuccessJob.job.jobId} and ${createdFailureJob.job.jobId}. Verified authenticated submit, stored-result retrieval, compile-failure normalization, and denied cross-user access.`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Wave 17 local Java execution validation failed.')
  console.error(error)
  process.exit(1)
})
