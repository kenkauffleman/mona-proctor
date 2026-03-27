import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function main() {
  const root = path.resolve(process.cwd(), 'infra/terraform/hosted')
  const rootMainTf = await readFile(path.join(root, 'main.tf'), 'utf8')
  const firestoreMainTf = await readFile(path.join(root, 'modules/firestore/main.tf'), 'utf8')
  const cloudRunMainTf = await readFile(path.join(root, 'modules/cloud-run-backend/main.tf'), 'utf8')
  const frontendMainTf = await readFile(path.join(root, 'modules/firebase-frontend/main.tf'), 'utf8')

  if (!rootMainTf.includes('module "firestore"') || !rootMainTf.includes('module "cloud_run_backend"') || !rootMainTf.includes('module "firebase_frontend"')) {
    throw new Error('Expected the hosted Terraform root to include firestore, firebase_frontend, and cloud_run_backend modules.')
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

  if (!cloudRunMainTf.includes('ALLOWED_ORIGINS')) {
    throw new Error('Expected the hosted Cloud Run module to pass explicit ALLOWED_ORIGINS runtime configuration.')
  }

  if (!cloudRunMainTf.includes('member   = "allUsers"')) {
    throw new Error('Expected the hosted Cloud Run module to grant public network reachability for browser clients in Wave 11.')
  }

  if (!frontendMainTf.includes('google_identity_platform_config')) {
    throw new Error('Expected the hosted frontend module to manage Firebase Authentication configuration.')
  }

  if (!frontendMainTf.includes('google_firebase_web_app')) {
    throw new Error('Expected the hosted frontend module to manage a Firebase web app.')
  }

  if (!frontendMainTf.includes('authorized_domains')) {
    throw new Error('Expected the hosted frontend module to configure explicit authorized domains.')
  }

  console.log('Hosted Terraform config check passed.')
}

main().catch((error: unknown) => {
  console.error('Hosted Terraform config check failed.')
  console.error(error)
  process.exit(1)
})
