# mona-proctor

Wave 9 is focused on a unified hosted deployment flow for the validated vertical slice: one Terraform root for Firestore + Artifact Registry + private Cloud Run, plus one top-level operator workflow for `build`, `validate`, `plan`, and `deploy`.

The repo currently provides:

- Monaco-based recording and replay pages for browser history capture
- a local browser ↔ backend ↔ Firestore vertical prototype from Wave 7
- local Firestore emulator workflows and validation scripts
- a TypeScript backend history API with Firestore-backed persistence
- backend container validation scripts aligned with a future Cloud Run shape
- a single hosted Terraform root for Firestore, Artifact Registry, and private Cloud Run
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

The service stays non-public by default. The deploy step finishes with a private Cloud Run round-trip validation through Firestore.

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
- local Firestore emulator configuration
- a local container workflow aligned with the likely future Cloud Run runtime shape
- repo-managed hosted deployment for Firestore, Artifact Registry, and private Cloud Run in an existing GCP project

It intentionally does not include hosted frontend integration, Firebase Auth browser flow, final backend API design, submission/grading integration, App Check, Cloud Armor, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
