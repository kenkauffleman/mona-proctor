import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { CreateExecutionJobRequest, ExecutionJobResponse } from '../backend/executionApiTypes.js'

export type TerraformOutputs = {
  firebase_web_app: {
    value: {
      api_key: string
      project_id: string
    }
  }
  service_uri: {
    value: string
  }
}

export type ValidationUser = {
  email: string
  password: string
}

export function readTerraformOutputs(terraformDir = 'infra/terraform/hosted') {
  const raw = execFileSync('terraform', ['-chdir=' + terraformDir, 'output', '-json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  return JSON.parse(raw) as TerraformOutputs
}

export async function signInWithPassword(apiKey: string, user: ValidationUser) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      returnSecureToken: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Hosted sign-in failed for ${user.email}: ${await response.text()}`)
  }

  const body = await response.json() as { idToken: string }
  return body.idToken
}

export function parseNamedArg(name: string, args: string[]) {
  const index = args.indexOf(name)

  if (index === -1) {
    return undefined
  }

  return args[index + 1]
}

export function parseDeployEnvironment(args: string[]) {
  return parseNamedArg('--env', args) ?? 'test'
}

function parseEnvFileContents(contents: string) {
  const parsed: Record<string, string> = {}

  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()

    if (line.length === 0 || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

export function loadDeployEnvFile(environmentName: string) {
  const envFilePath = path.resolve(`.env.deploy.${environmentName}`)
  const contents = readFileSync(envFilePath, 'utf8')
  const parsed = parseEnvFileContents(contents)

  for (const [key, value] of Object.entries(parsed)) {
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }

  return envFilePath
}

export function readSourceFromArgs(args: string[]) {
  const sourceFile = parseNamedArg('--source-file', args)
  const inlineSource = parseNamedArg('--source', args)

  if (sourceFile) {
    return readFileSync(sourceFile, 'utf8')
  }

  if (inlineSource) {
    return inlineSource
  }

  throw new Error('Provide either --source-file <path> or --source <code>.')
}

export async function submitExecutionJob(
  backendBaseUrl: string,
  idToken: string,
  request: CreateExecutionJobRequest,
) {
  const response = await fetch(`${backendBaseUrl}/api/execution/jobs`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Execution submit failed with ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<ExecutionJobResponse>
}

export async function getExecutionJob(
  backendBaseUrl: string,
  idToken: string,
  jobId: string,
) {
  const response = await fetch(`${backendBaseUrl}/api/execution/jobs/${jobId}`, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Execution load failed with ${response.status}: ${await response.text()}`)
  }

  return response.json() as Promise<ExecutionJobResponse>
}

export async function waitForTerminalExecutionJob(
  backendBaseUrl: string,
  idToken: string,
  jobId: string,
  timeoutMs = 60_000,
) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await getExecutionJob(backendBaseUrl, idToken, jobId)

    if (response.job.result) {
      return response
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for execution job ${jobId}.`)
}

export function requireUserFromArgs(args: string[]) {
  const email = parseNamedArg('--email', args)
  const password = parseNamedArg('--password', args)

  if (!email || !password) {
    throw new Error('Provide --email <value> and --password <value>.')
  }

  return { email, password }
}

export function parseTerraformDir(args: string[]) {
  return parseNamedArg('--terraform-dir', args) ?? 'infra/terraform/hosted'
}

export function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}
