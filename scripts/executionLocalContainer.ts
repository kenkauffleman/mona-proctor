import { spawn } from 'node:child_process'

export function runCommand(
  command: string,
  args: string[],
  options: { capture?: boolean; env?: NodeJS.ProcessEnv } = {},
) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: options.capture ? 'pipe' : 'inherit',
    })

    let stdout = ''
    let stderr = ''

    if (options.capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString()
      })
    }

    child.once('error', reject)
    child.once('exit', (code) => {
      resolve({ code: code ?? 1, stdout, stderr })
    })
  })
}

export async function ensureDockerAvailable(dockerCommand = 'docker') {
  const result = await runCommand(dockerCommand, ['--version'], { capture: true }).catch((error) => {
    throw new Error(`Docker is required for local execution validation: ${String(error)}`)
  })

  if (result.code !== 0) {
    throw new Error(`Docker is required for local execution validation.\n${result.stderr || result.stdout}`)
  }
}

export async function buildLocalExecutorImage(
  language: 'python' | 'java',
  imageName: string,
  dockerCommand = 'docker',
) {
  const dockerfile = language === 'python'
    ? 'execution/python-runner/Dockerfile'
    : 'execution/java-runner/Dockerfile'
  const buildResult = await runCommand(dockerCommand, [
    'build',
    '-f',
    dockerfile,
    '-t',
    imageName,
    '.',
  ])

  if (buildResult.code !== 0) {
    throw new Error(`${language} execution runner image build failed for ${imageName}.`)
  }
}

export async function buildLocalExecutionRunnerImages(
  images: { pythonImageName: string; javaImageName: string },
  dockerCommand = 'docker',
) {
  await buildLocalExecutorImage('python', images.pythonImageName, dockerCommand)
  await buildLocalExecutorImage('java', images.javaImageName, dockerCommand)
}

export const buildLocalPythonRunnerImage = (imageName: string, dockerCommand = 'docker') =>
  buildLocalExecutorImage('python', imageName, dockerCommand)

export const buildLocalJavaRunnerImage = (imageName: string, dockerCommand = 'docker') =>
  buildLocalExecutorImage('java', imageName, dockerCommand)
