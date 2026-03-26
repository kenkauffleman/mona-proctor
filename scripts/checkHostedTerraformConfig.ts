import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function main() {
  const root = path.resolve(process.cwd(), 'infra/terraform/hosted')
  const rootMainTf = await readFile(path.join(root, 'main.tf'), 'utf8')
  const firestoreMainTf = await readFile(path.join(root, 'modules/firestore/main.tf'), 'utf8')
  const cloudRunMainTf = await readFile(path.join(root, 'modules/cloud-run-backend/main.tf'), 'utf8')

  if (!rootMainTf.includes('module "firestore"') || !rootMainTf.includes('module "cloud_run_backend"')) {
    throw new Error('Expected the hosted Terraform root to include both firestore and cloud_run_backend modules.')
  }

  if (!firestoreMainTf.includes('google_firestore_database')) {
    throw new Error('Expected the hosted Firestore module to manage a Firestore database resource.')
  }

  if (!firestoreMainTf.includes('file("${path.module}/../../../../../firestore.rules")')) {
    throw new Error('Expected the hosted Firestore module to publish the repo-managed firestore.rules file.')
  }

  if (!cloudRunMainTf.includes('google_artifact_registry_repository')) {
    throw new Error('Expected the hosted Cloud Run module to manage Artifact Registry.')
  }

  if (!cloudRunMainTf.includes('google_cloud_run_v2_service')) {
    throw new Error('Expected the hosted Cloud Run module to manage a Cloud Run service.')
  }

  if (!cloudRunMainTf.includes('google_cloud_run_v2_service_iam_member')) {
    throw new Error('Expected the hosted Cloud Run module to manage private invoker IAM.')
  }

  if (cloudRunMainTf.includes('allUsers')) {
    throw new Error('Hosted Cloud Run Terraform config must not grant public access to allUsers.')
  }

  console.log('Hosted Terraform config check passed.')
}

main().catch((error: unknown) => {
  console.error('Hosted Terraform config check failed.')
  console.error(error)
  process.exit(1)
})
