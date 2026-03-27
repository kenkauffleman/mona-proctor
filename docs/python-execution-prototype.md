# Python Execution Prototype

## Purpose
Wave 12 adds a script-driven Python execution prototype without UI integration.

The goal is to prove:
- a backend execution abstraction layer
- Firestore-backed execution job records
- remote execution through Cloud Run Jobs
- a tiny async result contract
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

## Separation of concerns
- The backend app knows about an `ExecutionService` and an `ExecutionBackend` interface.
- The backend app does not hardcode Cloud Run Job details throughout unrelated code.
- Firestore execution records are stored separately from history/session records.
- The Python runner is a separate container from the Node backend.

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

## Hosted validation
After the human operator deploys the new backend and execution job:

```bash
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
