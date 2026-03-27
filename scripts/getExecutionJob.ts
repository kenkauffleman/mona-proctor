import process from 'node:process'
import {
  getExecutionJob,
  parseNamedArg,
  parseTerraformDir,
  printJson,
  readTerraformOutputs,
  requireUserFromArgs,
  signInWithPassword,
  waitForTerminalExecutionJob,
} from './executionHosted.js'

async function main() {
  const args = process.argv.slice(2)
  const terraformDir = parseTerraformDir(args)
  const outputs = readTerraformOutputs(terraformDir)
  const user = requireUserFromArgs(args)
  const jobId = parseNamedArg('--job-id', args)

  if (!jobId) {
    throw new Error('Provide --job-id <execution-job-id>.')
  }

  const idToken = await signInWithPassword(outputs.firebase_web_app.value.api_key, user)
  const response = args.includes('--wait')
    ? await waitForTerminalExecutionJob(outputs.service_uri.value, idToken, jobId)
    : await getExecutionJob(outputs.service_uri.value, idToken, jobId)

  printJson(response)
}

main().catch((error: unknown) => {
  console.error('Execution job fetch failed.')
  console.error(error)
  process.exit(1)
})
