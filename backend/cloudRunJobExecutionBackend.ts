import type { ExecutionBackend, ExecutionDispatchResult } from './executionBackend.js'
import type { ExecutionRecord } from './executionTypes.js'

type CloudRunJobExecutionBackendOptions = {
  jobName: string
  projectId: string
  region: string
}

type MetadataAccessTokenResponse = {
  access_token: string
}

type CloudRunJobRunOperation = {
  name?: string
}

async function getMetadataAccessToken() {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    {
      headers: {
        'Metadata-Flavor': 'Google',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to acquire Cloud Run metadata access token: ${response.status} ${await response.text()}`)
  }

  const body = await response.json() as MetadataAccessTokenResponse

  if (!body.access_token) {
    throw new Error('Cloud Run metadata server returned no access token.')
  }

  return body.access_token
}

export class CloudRunJobExecutionBackend implements ExecutionBackend {
  readonly name = 'cloud-run-job'

  constructor(private readonly options: CloudRunJobExecutionBackendOptions) {}

  async dispatch(job: ExecutionRecord): Promise<ExecutionDispatchResult> {
    void job
    const accessToken = await getMetadataAccessToken()
    const endpoint = [
      'https://run.googleapis.com/v2/projects',
      this.options.projectId,
      'locations',
      this.options.region,
      `jobs/${this.options.jobName}:run`,
    ].join('/')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: '{}',
    })

    if (!response.ok) {
      throw new Error(`Cloud Run Job dispatch failed with ${response.status}: ${await response.text()}`)
    }

    const body = await response.json() as CloudRunJobRunOperation

    return {
      backendJobName: body.name ?? null,
    }
  }
}
