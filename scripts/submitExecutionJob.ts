import process from 'node:process'
import {
  loadDeployEnvFile,
  parseDeployEnvironment,
  parseTerraformDir,
  printJson,
  readSourceFromArgs,
  readTerraformOutputs,
  requireUserFromArgs,
  signInWithPassword,
  submitExecutionJob,
} from './executionHosted.js'

async function main() {
  const args = process.argv.slice(2)
  const deployEnvironment = parseDeployEnvironment(args)
  loadDeployEnvFile(deployEnvironment)
  const terraformDir = parseTerraformDir(args)
  const outputs = readTerraformOutputs(terraformDir)
  const user = requireUserFromArgs(args)
  const source = readSourceFromArgs(args)
  const idToken = await signInWithPassword(outputs.firebase_web_app.value.api_key, user)
  const response = await submitExecutionJob(
    outputs.service_uri.value,
    idToken,
    {
      language: 'python',
      source,
    },
  )

  printJson(response)
}

main().catch((error: unknown) => {
  console.error('Execution submission failed.')
  console.error(error)
  process.exit(1)
})
