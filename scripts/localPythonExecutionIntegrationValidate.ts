import { spawn } from 'node:child_process'
import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { ensureLocalAuthUser, localAuthUsers, signInLocalAuthUser } from './authEmulatorUsers.js'
import { buildLocalPythonRunnerImage, ensureDockerAvailable, runCommand } from './executionLocalContainer.js'

const port = 18081 + (process.pid % 1000)
const host = '127.0.0.1'
const baseUrl = `http://${host}:${port}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const pythonImageName = 'mona-proctor-python-runner-local'

type LoadedExecutionJob = {
  job: {
    jobId: string
    ownerUid: string
    backendJobName?: string | null
    result: {
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

async function main() {
  await ensureDockerAvailable()
  await buildLocalPythonRunnerImage(pythonImageName)

  const backendProcess = spawn(
    'npx',
    ['tsx', '--no-cache', 'backend/index.ts'],
    {
      env: {
        ...process.env,
        EXECUTION_BACKEND: 'local-container',
        EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: pythonImageName,
        EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: 'mona-proctor-java-runner-local',
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
    const createResponse = await fetch(`${baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        language: 'python',
        source: 'print("wave13")',
      }),
    })

    if (!createResponse.ok) {
      throw new Error(`Execution submit failed with ${createResponse.status}: ${await createResponse.text()}`)
    }

    const createdJob = await createResponse.json() as { job: { jobId: string; ownerUid: string } }

    if (createdJob.job.ownerUid !== firstUser.localId) {
      throw new Error(`Expected owner uid ${firstUser.localId} but received ${createdJob.job.ownerUid}`)
    }

    const firestore = new Firestore({ projectId })
    const deadline = Date.now() + 30_000
    let loadedJob: LoadedExecutionJob | null = null

    while (Date.now() < deadline) {
      const loadResponse = await fetch(`${baseUrl}/api/execution/jobs/${createdJob.job.jobId}`, {
        headers: {
          authorization: `Bearer ${firstUser.idToken}`,
        },
      })

      if (!loadResponse.ok) {
        throw new Error(`Execution load failed with ${loadResponse.status}: ${await loadResponse.text()}`)
      }

      loadedJob = await loadResponse.json() as LoadedExecutionJob

      if (loadedJob?.job.result) {
        break
      }

      await wait(500)
    }

    if (!loadedJob?.job.result) {
      throw new Error(`Timed out waiting for execution result for ${createdJob.job.jobId}`)
    }

    if (
      loadedJob.job.jobId !== createdJob.job.jobId
      || loadedJob.job.ownerUid !== firstUser.localId
      || loadedJob.job.result?.stdout !== 'wave13\n'
      || loadedJob.job.result.exitCode !== 0
      || loadedJob.job.result.truncated !== false
    ) {
      throw new Error(`Unexpected loaded execution job payload: ${JSON.stringify(loadedJob)}`)
    }

    const latestResponse = await fetch(`${baseUrl}/api/execution/jobs/latest`, {
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
      },
    })

    if (!latestResponse.ok) {
      throw new Error(`Latest execution load failed with ${latestResponse.status}: ${await latestResponse.text()}`)
    }

    const latestJob = await latestResponse.json() as { job: { jobId: string } | null }

    if (latestJob.job?.jobId !== createdJob.job.jobId) {
      throw new Error(`Expected latest execution job ${createdJob.job.jobId} but received ${JSON.stringify(latestJob)}`)
    }

    const forbiddenResponse = await fetch(`${baseUrl}/api/execution/jobs/${createdJob.job.jobId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    if (forbiddenResponse.status !== 403) {
      throw new Error(`Expected second user execution access to fail with 403 but received ${forbiddenResponse.status}`)
    }

    const secondLatestResponse = await fetch(`${baseUrl}/api/execution/jobs/latest`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    if (!secondLatestResponse.ok) {
      throw new Error(`Second user latest execution load failed with ${secondLatestResponse.status}: ${await secondLatestResponse.text()}`)
    }

    const secondLatestJob = await secondLatestResponse.json() as { job: null }

    if (secondLatestJob.job !== null) {
      throw new Error(`Expected no latest execution job for second user but received ${JSON.stringify(secondLatestJob)}`)
    }

    const snapshot = await firestore.collection('executionJobs').doc(createdJob.job.jobId).get()
    const document = snapshot.data() as { ownerUid?: string; result?: { stdout?: string } } | undefined

    if (!snapshot.exists || document?.ownerUid !== firstUser.localId || document.result?.stdout !== 'wave13\n') {
      throw new Error(`Expected stored execution record for ${createdJob.job.jobId} but found ${JSON.stringify(document)}`)
    }

    if (loadedJob.job.backendJobName) {
      const logs = await runCommand('docker', ['logs', loadedJob.job.backendJobName], { capture: true }).catch(() => null)

      if (!logs || (!logs.stdout.includes('Completed execution job') && !logs.stderr.includes('Completed execution job'))) {
        throw new Error(`Expected local runner logs for ${loadedJob.job.backendJobName} but could not confirm completion.`)
      }

      await runCommand('docker', ['rm', '-f', loadedJob.job.backendJobName], { capture: true }).catch(() => undefined)
    }

    console.log(
      `Wave 13 local execution integration validation succeeded for ${createdJob.job.jobId}. Verified authenticated submit, local container execution, stored-result retrieval, latest-job lookup, and denied cross-user access.`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Wave 13 local execution integration validation failed.')
  console.error(error)
  process.exit(1)
})
