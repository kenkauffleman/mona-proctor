# Python Execution Flow

## Purpose
Wave 12 added a script-driven Python execution prototype without UI integration.
Wave 13 keeps that backend shape and integrates it into the authenticated application UI.

The goal is to prove:
- a backend execution abstraction layer
- Firestore-backed execution job records
- remote execution through Cloud Run Jobs
- local execution through the same runner image in development
- a tiny async result contract
- UI integration that reuses the stored execution records
- repeatable operator validation

## High-level flow
1. An authenticated script submits Python source to `POST /api/execution/jobs`.
2. The backend validates language and source size limits.
3. The backend creates a Firestore execution record in `executionJobs` and a queue entry in `executionQueue`.
4. The backend dispatches the configured execution backend.
5. In Wave 12, the execution backend is a Cloud Run Job runner.
6. The Python runner claims one queued job from Firestore, marks it `running`, and executes the source.
7. The runner stores the terminal result back in Firestore and clears the active-job bookkeeping.
8. A script polls `GET /api/execution/jobs/:jobId` until the stored result is terminal.

## Wave 13 UI integration
Wave 13 adds the authenticated browser flow on top of the same backend contract:
1. A signed-in user edits Python in the main recording page.
2. The UI submits the current source to `POST /api/execution/jobs`.
3. The backend creates the stored execution record in Firestore and dispatches the configured execution backend as before.
4. The UI loads `GET /api/execution/jobs/latest` to find the authenticated user's latest stored execution record.
5. While the latest job remains `queued` or `running`, the UI polls `GET /api/execution/jobs/:jobId`.
6. The UI renders only the latest execution result for this wave:
   - `stdout`
   - `stderr`
   - `exitCode`
   - `durationMs`
   - `truncated`

The UI does not add history browsing or hidden-test grading in this wave.

## Separation of concerns
- The backend app knows about an `ExecutionService` and an `ExecutionBackend` interface.
- The backend app does not hardcode Cloud Run Job details throughout unrelated code.
- Firestore execution records are stored separately from history/session records.
- The Python runner is a separate container from the Node backend.

## Backend dispatch modes
The execution dispatch seam supports multiple backend modes behind the same queue-and-record contract:
- `cloud-run-job`
  - deployed behavior
  - backend starts the configured Cloud Run Job
- `local-container`
  - development behavior
  - backend starts the same Python runner image through local Docker
  - intended for full local testing with Firestore/Auth emulators
- `disabled`
  - explicit non-execution mode when needed for narrow backend work

## Firestore model

### `executionJobs/{jobId}`
Stores the durable execution record, including:
- owner uid
- language
- source
- source size
- backend name
- status timestamps
- terminal result payload

### `executionQueue/{jobId}`
Stores queued work for the runner to claim in document-id order.

### `executionActiveUsers/{uid}`
Stores one active execution pointer per authenticated user.

### `executionSystem/stats`
Stores the coarse global active-job count.

## Result contract
Terminal results include:
- `status`
- `stdout`
- `stderr`
- `exitCode`
- `durationMs`
- `truncated`

`truncated` becomes `true` when stdout or stderr exceeds the configured byte caps.

## Execution environment
- Python runtime image: `python:3.12-slim`
- stdin: empty
- argv: forced to `[]` before user code runs
- working directory: empty temporary directory
- source file: written as `main.py` inside that temporary directory

Wave 12 keeps enforcement simple.
The runner uses `python -I -S` and avoids extra runtime credentials in the child process, but it does not attempt heavyweight sandboxing beyond the current container/job boundary.

## Configured limits
Backend and runner limits are env-driven:
- `EXECUTION_MAX_SOURCE_BYTES`
- `EXECUTION_TIMEOUT_MS`
- `EXECUTION_MAX_STDOUT_BYTES`
- `EXECUTION_MAX_STDERR_BYTES`
- `EXECUTION_GLOBAL_ACTIVE_JOB_LIMIT`

Hosted Terraform surfaces the same values into the backend service and the execution job.

## Local validation
Validate the Python runner container before relying on hosted Cloud Run Jobs:

```bash
npm run execution:container:validate
```

This builds the Python runner image, seeds a Firestore-emulator job, runs the container locally, and verifies that the stored Firestore result is terminal and correct.

Validate the Wave 13 authenticated integration against local emulators:

```bash
npm run wave13:validate
```

This builds the local runner image, boots the backend against the Firestore and Auth emulators in `local-container` mode, submits Python execution through the authenticated API, waits for the real local runner container to complete the job, verifies latest-result retrieval from stored execution records, and checks a denied cross-user case.

Wave 14 adds formal automated local validation layers on top of those focused scripts:

```bash
npm run test:integration
npm run test:e2e
```

- `npm run test:integration`
  - validates backend/auth/Firestore/execution seams through emulator-backed Vitest tests
- `npm run test:e2e`
  - validates the local browser flow with Playwright against the same emulators and local runner image

For interactive local development, build the local runner image once before starting the app stack:

```bash
npm run execution:container:build
npm run emulator:local
npm run auth:seed
npm run dev
```

## Hosted validation
After the human operator deploys the new backend and execution job, use an explicit production target:

```bash
npm run deploy -- validate --env prod
npm run wave12:validate
```

This signs in with a seeded hosted Firebase user, submits `print("wave12 ok")`, polls for completion, and checks the stored result contract.

## Manual script usage
Submit Python source from a file:

```bash
npm run execution:submit -- --email student1@example.com --password pass1234 --source-file ./example.py
```

Fetch a job:

```bash
npm run execution:get -- --email student1@example.com --password pass1234 --job-id <job-id>
```

Wait for a terminal result:

```bash
npm run execution:get -- --email student1@example.com --password pass1234 --job-id <job-id> --wait
```

## Manual UI validation
After local validation passes and the hosted backend/execution job are deployed, a human operator can validate the integrated UI flow in `prod` by:
1. running `npm run deploy -- validate --env prod`
2. signing in with a seeded production Firebase Auth user
3. editing Python in the main app page
4. clicking `Run Python`
5. confirming that the latest result panel shows stdout, stderr, exit status, duration, and truncation from the stored execution record
