import { buildLocalPythonRunnerImage, ensureDockerAvailable } from './executionLocalContainer.js'

const imageName = process.env.EXECUTION_LOCAL_CONTAINER_IMAGE_NAME ?? 'mona-proctor-python-runner-local'

async function main() {
  await ensureDockerAvailable()
  await buildLocalPythonRunnerImage(imageName)
  console.log(`Built local Python runner image ${imageName}.`)
}

main().catch((error: unknown) => {
  console.error('Local Python runner image build failed.')
  console.error(error)
  process.exit(1)
})
