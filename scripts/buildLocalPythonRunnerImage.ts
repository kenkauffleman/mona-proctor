import { buildLocalExecutionRunnerImages, ensureDockerAvailable } from './executionLocalContainer.js'

const pythonImageName = process.env.EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME ?? 'mona-proctor-python-runner-local'
const javaImageName = process.env.EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME ?? 'mona-proctor-java-runner-local'

async function main() {
  await ensureDockerAvailable()
  await buildLocalExecutionRunnerImages({ pythonImageName, javaImageName })
  console.log(`Built local execution runner images ${pythonImageName} and ${javaImageName}.`)
}

main().catch((error: unknown) => {
  console.error('Local execution runner image build failed.')
  console.error(error)
  process.exit(1)
})
