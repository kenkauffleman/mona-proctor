// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Firestore } from '@google-cloud/firestore'
import { buildLocalExecutionRunnerImages, ensureDockerAvailable, runCommand } from '../../scripts/executionLocalContainer.js'
import {
  createAuthHeaders,
  createBackendPort,
  ensureDefaultLocalAuthUsers,
  localAuthUsers,
  signInLocalAuthUser,
  startBackendProcess,
  stopBackendProcess,
  wait,
} from './helpers/localBackendHarness.js'

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const pythonImageName = 'mona-proctor-python-runner-local'
const javaImageName = 'mona-proctor-java-runner-local'

describe('execution integration', () => {
  let backendProcess: Awaited<ReturnType<typeof startBackendProcess>> | null = null

  beforeEach(async () => {
    await ensureDockerAvailable()
    await buildLocalExecutionRunnerImages({ pythonImageName, javaImageName })
    await ensureDefaultLocalAuthUsers()
  })

  afterEach(async () => {
    await stopBackendProcess(backendProcess?.child ?? null)
    backendProcess = null
  })

  it('runs authenticated python execution locally and persists the terminal result', async () => {
    backendProcess = await startBackendProcess(createBackendPort(), {
      EXECUTION_BACKEND: 'local-container',
      EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: pythonImageName,
      EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: javaImageName,
    })

    const firstUser = await signInLocalAuthUser(localAuthUsers[0]!)
    const secondUser = await signInLocalAuthUser(localAuthUsers[1]!)

    const createResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(firstUser.idToken),
      body: JSON.stringify({
        language: 'python',
        source: 'print("wave14 execution")',
      }),
    })

    expect(createResponse.status).toBe(202)

    const createdJob = await createResponse.json() as {
      job: {
        jobId: string
        ownerUid: string
      }
    }

    expect(createdJob.job.ownerUid).toBe(firstUser.localId)

    const deadline = Date.now() + 30_000
    let loadedJob: {
      job: {
        jobId: string
        ownerUid: string
        backendJobName?: string | null
        result: {
          stdout: string
          stderr: string
          exitCode: number | null
          truncated: boolean
        } | null
      }
    } | null = null

    while (Date.now() < deadline) {
      const loadResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs/${createdJob.job.jobId}`, {
        headers: {
          authorization: `Bearer ${firstUser.idToken}`,
        },
      })

      expect(loadResponse.status).toBe(200)
      loadedJob = await loadResponse.json()

      if (loadedJob.job.result) {
        break
      }

      await wait(500)
    }

    expect(loadedJob?.job.result).not.toBeNull()
    expect(loadedJob?.job.result).toMatchObject({
      stdout: 'wave14 execution\n',
      stderr: '',
      exitCode: 0,
      truncated: false,
    })

    const latestResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs/latest`, {
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
      },
    })

    expect(latestResponse.status).toBe(200)
    expect(await latestResponse.json()).toMatchObject({
      job: {
        jobId: createdJob.job.jobId,
      },
    })

    const forbiddenResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs/${createdJob.job.jobId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    expect(forbiddenResponse.status).toBe(403)
    expect(await forbiddenResponse.json()).toEqual({
      ok: false,
      error: 'Authenticated user does not own this execution job.',
    })

    const firestore = new Firestore({ projectId })
    const snapshot = await firestore.collection('executionJobs').doc(createdJob.job.jobId).get()
    const document = snapshot.data() as { ownerUid?: string; result?: { stdout?: string } } | undefined

    expect(snapshot.exists).toBe(true)
    expect(document?.ownerUid).toBe(firstUser.localId)
    expect(document?.result?.stdout).toBe('wave14 execution\n')

    if (loadedJob?.job.backendJobName) {
      const logs = await runCommand('docker', ['logs', loadedJob.job.backendJobName], { capture: true }).catch(() => null)
      expect(logs && (logs.stdout.includes('Completed execution job') || logs.stderr.includes('Completed execution job'))).toBe(true)
      await runCommand('docker', ['rm', '-f', loadedJob.job.backendJobName], { capture: true }).catch(() => undefined)
    }
  }, 90_000)

  it('runs authenticated Java execution locally, including compile failures as normal results', async () => {
    backendProcess = await startBackendProcess(createBackendPort(), {
      EXECUTION_BACKEND: 'local-container',
      EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: pythonImageName,
      EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: javaImageName,
    })

    const firstUser = await signInLocalAuthUser(localAuthUsers[0]!)

    const successResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(firstUser.idToken),
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

    expect(successResponse.status).toBe(202)
    const successJob = await successResponse.json() as { job: { jobId: string } }

    const deadline = Date.now() + 30_000
    let loadedSuccessJob: { job: { result: { stdout: string; stderr: string; exitCode: number | null } | null } } | null = null

    while (Date.now() < deadline) {
      const loadResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs/${successJob.job.jobId}`, {
        headers: { authorization: `Bearer ${firstUser.idToken}` },
      })

      expect(loadResponse.status).toBe(200)
      loadedSuccessJob = await loadResponse.json()

      if (loadedSuccessJob.job.result) {
        break
      }

      await wait(500)
    }

    expect(loadedSuccessJob?.job.result).toMatchObject({
      stdout: 'wave17 java\n',
      stderr: '',
      exitCode: 0,
    })

    const compileFailureResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs`, {
      method: 'POST',
      headers: createAuthHeaders(firstUser.idToken),
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

    expect(compileFailureResponse.status).toBe(202)
    const compileFailureJob = await compileFailureResponse.json() as { job: { jobId: string } }

    let loadedFailureJob: { job: { result: { status: string; stderr: string; exitCode: number | null } | null } } | null = null
    const failureDeadline = Date.now() + 30_000

    while (Date.now() < failureDeadline) {
      const loadResponse = await fetch(`${backendProcess.baseUrl}/api/execution/jobs/${compileFailureJob.job.jobId}`, {
        headers: { authorization: `Bearer ${firstUser.idToken}` },
      })

      expect(loadResponse.status).toBe(200)
      loadedFailureJob = await loadResponse.json()

      if (loadedFailureJob.job.result) {
        break
      }

      await wait(500)
    }

    expect(loadedFailureJob?.job.result?.status).toBe('failed')
    expect(loadedFailureJob?.job.result?.stderr).toContain('error:')
    expect(loadedFailureJob?.job.result?.exitCode).toBe(1)
  }, 90_000)
})
