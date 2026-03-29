import { defineConfig, devices } from '@playwright/test'

const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 4173)
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8081)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx tsx --no-cache scripts/startLocalTestStack.ts',
    url: `http://127.0.0.1:${frontendPort}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 180_000,
    env: {
      ...process.env,
      E2E_FRONTEND_PORT: String(frontendPort),
      E2E_BACKEND_PORT: String(backendPort),
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT ?? 'demo-mona-proctor',
      EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME: process.env.EXECUTION_LOCAL_CONTAINER_PYTHON_IMAGE_NAME ?? 'mona-proctor-python-runner-local',
      EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME: process.env.EXECUTION_LOCAL_CONTAINER_JAVA_IMAGE_NAME ?? 'mona-proctor-java-runner-local',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
