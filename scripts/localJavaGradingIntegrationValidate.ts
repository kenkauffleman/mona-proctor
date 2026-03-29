import { spawn } from 'node:child_process'
import process from 'node:process'
import { Firestore } from '@google-cloud/firestore'
import { ensureLocalAuthUser, localAuthUsers, signInLocalAuthUser } from './authEmulatorUsers.js'
import { buildLocalJavaRunnerImage, ensureDockerAvailable, runCommand } from './executionLocalContainer.js'

const port = 19181 + (process.pid % 1000)
const host = '127.0.0.1'
const baseUrl = `http://${host}:${port}`
const projectId = process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor'
const javaImageName = 'mona-proctor-java-runner-local'

type LoadedJavaGradingJob = {
  job: {
    gradingJobId: string
    ownerUid: string
    result: {
      compileFailed: boolean
      overallStatus: string
      passedTests: number
      totalTests: number
      tests: Array<{
        status: string
        stderr: string | null
      }>
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

async function waitForTerminalJob(gradingJobId: string, idToken: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const loadResponse = await fetch(`${baseUrl}/api/java-grading/jobs/${gradingJobId}`, {
      headers: {
        authorization: `Bearer ${idToken}`,
      },
    })

    if (!loadResponse.ok) {
      throw new Error(`Java grading load failed with ${loadResponse.status}: ${await loadResponse.text()}`)
    }

    const loadedJob = await loadResponse.json() as LoadedJavaGradingJob

    if (loadedJob.job.result) {
      return loadedJob
    }

    await wait(500)
  }

  throw new Error(`Timed out waiting for Java grading result for ${gradingJobId}`)
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

    const successSubmitResponse = await fetch(`${baseUrl}/api/java-grading/jobs`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        problemId: 'java-fibonacci',
        source: `import java.util.Scanner;

public class Main {
  public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);
    int n = scanner.nextInt();
    long a = 0;
    long b = 1;

    for (int i = 0; i < n; i += 1) {
      long next = a + b;
      a = b;
      b = next;
    }

    System.out.println(a);
  }
}
`,
      }),
    })

    if (!successSubmitResponse.ok) {
      throw new Error(`Java grading submit failed with ${successSubmitResponse.status}: ${await successSubmitResponse.text()}`)
    }

    const createdSuccessJob = await successSubmitResponse.json() as { job: { gradingJobId: string; ownerUid: string } }

    if (createdSuccessJob.job.ownerUid !== firstUser.localId) {
      throw new Error(`Expected owner uid ${firstUser.localId} but received ${createdSuccessJob.job.ownerUid}`)
    }

    const loadedSuccessJob = await waitForTerminalJob(createdSuccessJob.job.gradingJobId, firstUser.idToken, 45_000)

    if (
      loadedSuccessJob.job.result?.compileFailed !== false
      || loadedSuccessJob.job.result.overallStatus !== 'passed'
      || loadedSuccessJob.job.result.passedTests !== 4
      || loadedSuccessJob.job.result.totalTests !== 4
    ) {
      throw new Error(`Unexpected loaded Java grading success payload: ${JSON.stringify(loadedSuccessJob)}`)
    }

    const compileFailureSubmitResponse = await fetch(`${baseUrl}/api/java-grading/jobs`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${firstUser.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        problemId: 'java-fibonacci',
        source: `public class Main {
  public static void main(String[] args) {
    System.out.println("missing semicolon")
  }
}
`,
      }),
    })

    if (!compileFailureSubmitResponse.ok) {
      throw new Error(`Java grading compile-failure submit failed with ${compileFailureSubmitResponse.status}: ${await compileFailureSubmitResponse.text()}`)
    }

    const createdFailureJob = await compileFailureSubmitResponse.json() as { job: { gradingJobId: string } }
    const loadedFailureJob = await waitForTerminalJob(createdFailureJob.job.gradingJobId, firstUser.idToken, 45_000)

    if (
      loadedFailureJob.job.result?.compileFailed !== true
      || loadedFailureJob.job.result.overallStatus !== 'error'
      || loadedFailureJob.job.result.tests[0]?.status !== 'error'
      || !loadedFailureJob.job.result.tests[0]?.stderr?.includes('error:')
    ) {
      throw new Error(`Unexpected loaded Java grading compile-failure payload: ${JSON.stringify(loadedFailureJob)}`)
    }

    const forbiddenResponse = await fetch(`${baseUrl}/api/java-grading/jobs/${createdFailureJob.job.gradingJobId}`, {
      headers: {
        authorization: `Bearer ${secondUser.idToken}`,
      },
    })

    if (forbiddenResponse.status !== 403) {
      throw new Error(`Expected second user Java grading access to fail with 403 but received ${forbiddenResponse.status}`)
    }

    const firestore = new Firestore({ projectId })
    const snapshot = await firestore.collection('javaGradingJobs').doc(createdFailureJob.job.gradingJobId).get()
    const document = snapshot.data() as { ownerUid?: string; result?: { compileFailed?: boolean } } | undefined

    if (!snapshot.exists || document?.ownerUid !== firstUser.localId || document.result?.compileFailed !== true) {
      throw new Error(`Expected stored Java grading record for ${createdFailureJob.job.gradingJobId} but found ${JSON.stringify(document)}`)
    }

    const dockerContainers = await runCommand('docker', ['ps', '-a', '--format', '{{.Names}}'], { capture: true }).catch(() => null)
    if (dockerContainers) {
      for (const line of dockerContainers.stdout.split('\n')) {
        if (line.startsWith('mona-proctor-java-runner-local-job-')) {
          await runCommand('docker', ['rm', '-f', line], { capture: true }).catch(() => undefined)
        }
      }
    }

    console.log(
      `Wave 18 local Java grading validation succeeded for ${createdSuccessJob.job.gradingJobId} and ${createdFailureJob.job.gradingJobId}. Verified authenticated grading, stored structured results, compile-failure handling, and denied cross-user access.`,
    )
  } finally {
    backendProcess.kill('SIGTERM')
    await wait(500)
  }
}

main().catch((error: unknown) => {
  console.error('Wave 18 local Java grading validation failed.')
  console.error(error)
  process.exit(1)
})
