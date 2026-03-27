# mona-proctor

Wave 12 focuses on a Python execution prototype: authenticated script submission, Firestore-backed execution records, and a Cloud Run Job-based Python runner behind a swappable backend execution interface.

The repo currently provides:

- Monaco-based recording and replay pages for browser history capture
- a local browser ↔ backend ↔ Firestore vertical prototype from Wave 7
- local Firestore emulator workflows and validation scripts
- a TypeScript backend history API with Firestore-backed persistence
- a TypeScript backend execution API for script-driven Python submission and result retrieval
- backend container validation scripts aligned with a future Cloud Run shape
- a Python runner container validated locally before hosted execution use
- a single hosted Terraform root for Firestore, Artifact Registry, Cloud Run service, and Cloud Run Job
- one project-level deploy workflow for hosted environments like `test` and `prod`

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local history API backend. The frontend binds to `0.0.0.0`, which works well in Codespaces or other remote container environments.

## Firestore emulator

```bash
npm run emulator:firestore
```

This starts the local Firestore emulator on `0.0.0.0:8080` and the Firebase Emulator UI on `0.0.0.0:4000`, which makes both easier to inspect in Codespaces or another remote container.

To run the repeatable sanity check that starts the emulator, writes a trivial document, reads it back, and exits:

```bash
npm run emulator:firestore:check
```

To run the manual sanity check that prints the fetched document and keeps the emulator plus UI running for inspection:

```bash
npm run emulator:firestore:manualcheck
```

These Phase 4-style scripts validate the emulator directly and do not involve the backend container.

## Wave 7 local vertical-slice validation

Start the Firestore emulator:

```bash
npm run emulator:firestore
```

Start the backend directly:

```bash
npm run backend:dev
```

This direct-run backend script is preconfigured for local emulator use and sets `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.

Exercise the backend history API without the frontend:

```bash
npm run backend:api:exercise
```

The endpoint is:

```text
POST /api/history/sessions/:sessionId/batches
```

The exercise script appends a tiny history batch to a generated session id and then loads that session back through `GET /api/history/sessions/:sessionId`.

To run the repeatable local workflow that starts the emulator, boots the backend, calls the endpoint, verifies the round trip, and shuts everything down:

```bash
npm run backend:api:validate
```

## Backend container validation

Build the backend validation image:

```bash
npm run backend:container:build
```

Run the backend container locally against a separately running Firestore emulator:

```bash
npm run emulator:firestore
npm run backend:container:run
```

Run the repeatable Wave 5 validation flow that starts the Firestore emulator, builds the backend container, runs it, calls the backend validation endpoint, confirms the Firestore write/read, and shuts everything down:

```bash
npm run backend:container:validate
```

The container scripts require a local Docker-compatible runtime to be available.

## Hosted deployment

Hosted deployment keeps cloud changes human-controlled and follows [`docs/deployment-safety.md`](./docs/deployment-safety.md).

Preferred setup:

```bash
cp .env.deploy.test.example .env.deploy.test
cp .env.deploy.prod.example .env.deploy.prod
```

Then, from a trusted local machine with `terraform` and `gcloud` installed:

```bash
npm run deploy -- adopt --env test
npm run deploy -- build --env test
npm run deploy -- validate --env test
npm run deploy -- plan --env test
npm run deploy -- deploy --env test
```

Terraform uses local Application Default Credentials from the human operator's machine. No cloud secrets, service account keys, or live credentials are required in the repo or agent environment.

The deploy flow now builds and pushes both the backend image and the Python execution runner image. The service stays non-public by default. After deploy, run the Wave 12 execution validator to confirm the hosted Python path.

Keep `FIRESTORE_DATABASE_NAME="(default)"` for this phase. If your project was already provisioned with the older split Terraform roots, run `npm run deploy -- adopt --env <name>` once before the normal hosted flow.

See [docs/hosted-deployment.md](./docs/hosted-deployment.md) for the full runbook.

## Available scripts

- `npm run dev` starts the frontend and backend together
- `npm run dev:web` starts only the Vite frontend
- `npm run dev:api` starts only the history API backend
- `npm run backend:dev` starts only the Firestore-validation backend outside Docker
- `npm run backend:api:exercise` calls the backend validation endpoint on a running backend without the frontend
- `npm run backend:api:validate` runs the repeatable local backend API seam validation flow against the Firestore emulator
- `npm run backend:build` compiles the backend validation service to `dist/backend`
- `npm run backend:container:build` builds the local backend validation container image
- `npm run backend:container:run` runs the built backend container against a local Firestore emulator
- `npm run backend:container:validate` runs the repeatable container-to-emulator validation flow
- `npm run emulator:firestore` starts the local Firestore emulator and Emulator UI
- `npm run emulator:firestore:check` runs the emulator-backed read/write sanity check
- `npm run emulator:firestore:manualcheck` runs the same sanity check, prints the fetched document, and keeps the emulator UI running
- `npm run deploy -- adopt --env <name>` imports existing Firestore resources into the unified hosted Terraform state one time during migration
- `npm run deploy -- build --env <name>` bootstraps hosted prerequisites, then builds and pushes the backend image
- `npm run execution:container:validate` validates the Python runner container locally against the Firestore emulator
- `npm run execution:submit -- --email <email> --password <password> --source-file <path>` submits a hosted Python execution job
- `npm run execution:get -- --email <email> --password <password> --job-id <id>` fetches a hosted execution job record
- `npm run wave12:validate` validates the hosted Python execution prototype end to end
- `npm run deploy -- validate --env <name>` runs repo checks plus hosted Terraform validation
- `npm run deploy -- plan --env <name>` writes one reviewable Terraform plan for the whole hosted slice
- `npm run deploy -- deploy --env <name>` applies the reviewed hosted plan and runs private end-to-end validation
- `npm run build` creates a production build
- `npm run typecheck` runs TypeScript project checks
- `npm test` runs the test suite
- `npm run lint` runs ESLint

## Current scope

This repo intentionally includes:

- local recording and replay demo pages
- local and backend Firestore validation paths
- simple append-oriented history API endpoints
- simple append-oriented execution API endpoints for scripts
- local Firestore emulator configuration
- a local container workflow aligned with the execution runner shape
- repo-managed hosted deployment for Firestore, Artifact Registry, private Cloud Run, and a Python execution Cloud Run Job in an existing GCP project

It intentionally does not include UI integration for execution results, hidden tests, grading semantics, Java execution, App Check, Cloud Armor, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
Wave 12 execution flow details live in [docs/python-execution-prototype.md](./docs/python-execution-prototype.md).
