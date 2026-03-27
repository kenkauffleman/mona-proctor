import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type TerraformOutputs = {
  firebase_web_app: {
    value: {
      api_key: string
      app_id: string
      auth_domain: string
      project_id: string
    }
  }
  service_uri: {
    value: string
  }
}

type Config = {
  outputFile: string
  terraformDir: string
}

function parseArgs(argv: string[]): Config {
  const config: Config = {
    outputFile: path.resolve('.firebase', 'hosting.frontend.env'),
    terraformDir: path.resolve('infra/terraform/hosted'),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const value = argv[index + 1]

    switch (argument) {
      case '--output':
        config.outputFile = path.resolve(value)
        index += 1
        break
      case '--terraform-dir':
        config.terraformDir = path.resolve(value)
        index += 1
        break
      default:
        throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return config
}

function readTerraformOutputs(terraformDir: string) {
  const raw = execFileSync('terraform', [`-chdir=${terraformDir}`, 'output', '-json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  return JSON.parse(raw) as TerraformOutputs
}

async function main() {
  const config = parseArgs(process.argv.slice(2))
  const outputs = readTerraformOutputs(config.terraformDir)

  const envFile = [
    `VITE_API_BASE_URL=${outputs.service_uri.value}/api`,
    `VITE_FIREBASE_API_KEY=${outputs.firebase_web_app.value.api_key}`,
    `VITE_FIREBASE_APP_ID=${outputs.firebase_web_app.value.app_id}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${outputs.firebase_web_app.value.auth_domain}`,
    `VITE_FIREBASE_PROJECT_ID=${outputs.firebase_web_app.value.project_id}`,
    '',
  ].join('\n')

  await mkdir(path.dirname(config.outputFile), { recursive: true })
  await writeFile(config.outputFile, envFile, 'utf8')

  console.log(`Wrote hosted frontend env to ${config.outputFile}`)
}

main().catch((error: unknown) => {
  console.error('Failed to render hosted frontend env file.')
  console.error(error)
  process.exit(1)
})
