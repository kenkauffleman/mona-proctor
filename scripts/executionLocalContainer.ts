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
    throw new Error(`Docker is required for local Python execution: ${String(error)}`)
  })

  if (result.code !== 0) {
    throw new Error(`Docker is required for local Python execution.\n${result.stderr || result.stdout}`)
  }
}

export async function buildLocalPythonRunnerImage(imageName: string, dockerCommand = 'docker') {
  const buildResult = await runCommand(dockerCommand, [
    'build',
    '-f',
    'execution/python-runner/Dockerfile',
    '-t',
    imageName,
    '.',
  ])

  if (buildResult.code !== 0) {
    throw new Error(`Python execution runner image build failed for ${imageName}.`)
  }
}
