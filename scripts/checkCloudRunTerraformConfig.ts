import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function main() {
  const terraformRoot = path.resolve(process.cwd(), 'infra/terraform/cloud-run-backend')
  const mainTf = await readFile(path.join(terraformRoot, 'main.tf'), 'utf8')
  const variablesTf = await readFile(path.join(terraformRoot, 'variables.tf'), 'utf8')

  const requiredServices = [
    'run.googleapis.com',
    'firestore.googleapis.com',
  ]

  for (const service of requiredServices) {
    if (!mainTf.includes(service)) {
      throw new Error(`Expected Cloud Run Terraform config to enable ${service}.`)
    }
  }

  if (!mainTf.includes('google_cloud_run_v2_service')) {
    throw new Error('Expected a google_cloud_run_v2_service resource in the Cloud Run Terraform root.')
  }

  if (!mainTf.includes('google_cloud_run_v2_service_iam_member')) {
    throw new Error('Expected a private Cloud Run invoker IAM member resource in the Cloud Run Terraform root.')
  }

  if (mainTf.includes('allUsers')) {
    throw new Error('Cloud Run Terraform config must not grant public access to allUsers.')
  }

  if (!variablesTf.includes('variable "invoker_principal"')) {
    throw new Error('Expected invoker_principal to be a required Terraform input.')
  }

  console.log('Cloud Run Terraform config check passed.')
}

main().catch((error: unknown) => {
  console.error('Cloud Run Terraform config check failed.')
  console.error(error)
  process.exit(1)
})
