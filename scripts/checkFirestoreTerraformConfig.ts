import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assertContains(content: string, fragment: string, description: string) {
  if (!content.includes(fragment)) {
    throw new Error(`Expected Terraform config to include ${description}.`)
  }
}

function main() {
  const mainTfPath = resolve('infra/terraform/firestore/main.tf')
  const mainTf = readFileSync(mainTfPath, 'utf8')

  assertContains(mainTf, 'file("${path.module}/../../../firestore.rules")', 'the repo-managed firestore.rules file reference')
  assertContains(mainTf, 'google_firestore_database', 'a Firestore database resource')
  assertContains(mainTf, 'google_firebaserules_release', 'a Firestore rules release resource')

  console.log('Firestore Terraform configuration references the repo-managed rules file and expected resources.')
}

main()
