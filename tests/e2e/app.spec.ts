import { expect, test, type Page } from '@playwright/test'

const authEmulatorBaseUrl = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const fakeApiKey = 'demo-mona-proctor-local-key'

async function signIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('pass1234')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Authenticated code execution' })).toBeVisible()
}

async function signInAuthEmulator(email: string) {
  const response = await fetch(`${authEmulatorBaseUrl}/accounts:signInWithPassword?key=${fakeApiKey}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: 'pass1234',
      returnSecureToken: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`Auth emulator sign-in failed for ${email}: ${await response.text()}`)
  }

  return response.json() as Promise<{ idToken: string }>
}

async function createHistorySession(sessionId: string, idToken: string) {
  const response = await fetch(`http://127.0.0.1:8081/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [{
        sequence: 1,
        timestamp: 100,
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
          rangeOffset: 0,
          rangeLength: 0,
          text: 'print("private session")',
        }],
      }],
    }),
  })

  if (!response.ok) {
    throw new Error(`History append failed for ${sessionId}: ${await response.text()}`)
  }
}

test('authenticated happy path loads the recording page and local execution controls', async ({ page }) => {
  await signIn(page, 'student1@example.com')

  await expect(page.getByText('Signed in:')).toBeVisible()
  await expect(page.getByText('student1@example.com')).toBeVisible()
  await expect(page.getByText('Waiting for first batch')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run Python' })).toBeEnabled()
  await expect(page.getByText('No execution submitted yet')).toBeVisible()
})

test('execution submission displays the latest stored result', async ({ page }) => {
  await signIn(page, 'student1@example.com')
  await page.locator('.monaco-editor').first().click({
    position: { x: 80, y: 24 },
  })
  await page.keyboard.insertText('print("Hello, Mona!")')
  await page.getByRole('button', { name: 'Run Python' }).click()

  await expect(page.getByText('Execution succeeded')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Execution stdout')).toContainText('Hello, Mona!')
  await expect(page.getByText('Exit status: 0')).toBeVisible()
})

test('java selection enables the Java execution controls', async ({ page }) => {
  await signIn(page, 'student1@example.com')
  await page.getByLabel('Language').selectOption('java')

  await expect(page.getByRole('button', { name: 'Run Java' })).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'Java Execution' })).toBeVisible()
  await expect(page.getByText('No execution submitted yet')).toBeVisible()
})

test('javascript selection exposes the local execution guardrail', async ({ page }) => {
  await signIn(page, 'student1@example.com')
  await page.getByLabel('Language').selectOption('javascript')

  await expect(page.getByRole('button', { name: 'Run Code' })).toBeDisabled()
  await expect(page.getByText('Execution is available only when the Python or Java editor is selected in this wave.')).toBeVisible()
})

test('one user cannot replay another user session', async ({ page }) => {
  const firstUser = await signInAuthEmulator('student1@example.com')
  const sessionId = `wave14-e2e-${Date.now()}`

  await createHistorySession(sessionId, firstUser.idToken)
  await signIn(page, 'student2@example.com')
  await page.goto(`/replay?sessionId=${sessionId}`)
  await page.getByRole('button', { name: 'Load History' }).click()

  await expect(page.getByText('Authenticated user does not own this session.')).toBeVisible()
})
