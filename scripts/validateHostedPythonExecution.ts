import process from 'node:process'
import { parseAuthSeedUsers } from './authSeedUsers.js'
import {
  parseTerraformDir,
  readTerraformOutputs,
  signInWithPassword,
  submitExecutionJob,
  waitForTerminalExecutionJob,
} from './executionHosted.js'

async function main() {
  const terraformDir = parseTerraformDir(process.argv.slice(2))
  const outputs = readTerraformOutputs(terraformDir)
  const [ownerUser] = parseAuthSeedUsers(process.env.AUTH_SEED_USERS_JSON, { required: true })

  if (!ownerUser) {
    throw new Error('AUTH_SEED_USERS_JSON must contain at least one user.')
  }

  const idToken = await signInWithPassword(outputs.firebase_web_app.value.api_key, ownerUser)
  const submitResponse = await submitExecutionJob(
    outputs.service_uri.value,
    idToken,
    {
      language: 'python',
      source: 'print("wave12 ok")',
    },
  )
  const jobId = submitResponse.job.jobId
  const terminalResponse = await waitForTerminalExecutionJob(
    outputs.service_uri.value,
    idToken,
    jobId,
    120_000,
  )

  if (terminalResponse.job.result?.status !== 'succeeded') {
    throw new Error(`Expected succeeded status but received ${JSON.stringify(terminalResponse.job)}`)
  }

  if (terminalResponse.job.result.stdout.trim() !== 'wave12 ok') {
    throw new Error(`Unexpected stdout payload: ${JSON.stringify(terminalResponse.job.result)}`)
  }

  if (terminalResponse.job.result.stderr !== '') {
    throw new Error(`Expected empty stderr but received ${JSON.stringify(terminalResponse.job.result)}`)
  }

  if (terminalResponse.job.result.exitCode !== 0) {
    throw new Error(`Expected exitCode 0 but received ${JSON.stringify(terminalResponse.job.result)}`)
  }

  if (typeof terminalResponse.job.result.durationMs !== 'number') {
    throw new Error(`Expected durationMs to be present but received ${JSON.stringify(terminalResponse.job.result)}`)
  }

  console.log(`Hosted Python execution validation succeeded for ${jobId}.`)
  console.log(`Received stdout ${JSON.stringify(terminalResponse.job.result.stdout.trim())} from ${outputs.service_uri.value}.`)
}

main().catch((error: unknown) => {
  console.error('Hosted Python execution validation failed.')
  console.error(error)
  process.exit(1)
})
