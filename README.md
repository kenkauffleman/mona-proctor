# mona-proctor

Wave 9 is focused on human-run backend deployment for the existing GCP project: repo-managed Terraform, explicit operator scripts, private-by-default Cloud Run hosting, and hosted Firestore connectivity without giving the agent live cloud credentials.

The repo currently provides:

- Monaco-based recording and replay pages for browser history capture
- a local browser ↔ backend ↔ Firestore vertical prototype from Wave 7
- local Firestore emulator workflows and validation scripts
- a TypeScript backend history API with Firestore-backed persistence
- backend container validation scripts aligned with a future Cloud Run shape
- Wave 8 Terraform and local operator scripts for hosted Firestore provisioning in an existing GCP project
- Wave 9 Terraform and local operator scripts for private Cloud Run backend deployment

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

## Wave 8 hosted Firestore provisioning

Wave 8 keeps cloud changes human-controlled and follows [`docs/deployment-safety.md`](./docs/deployment-safety.md).

From a trusted local machine with `terraform` and `gcloud` installed:

```bash
npm run deploy:firestore:check
npm run deploy:firestore:validate -- --project YOUR_PROJECT_ID --location FIRESTORE_LOCATION
npm run deploy:firestore:plan -- --project YOUR_PROJECT_ID --location FIRESTORE_LOCATION
npm run deploy:firestore:apply -- --project YOUR_PROJECT_ID --location FIRESTORE_LOCATION
```

Terraform uses local Application Default Credentials from the human operator's machine. No cloud secrets, service account keys, or live credentials are required in the repo or agent environment.

See [docs/firestore-provisioning.md](./docs/firestore-provisioning.md) for the full runbook.

## Wave 9 private Cloud Run backend deployment

Wave 9 keeps cloud changes human-controlled and follows [`docs/deployment-safety.md`](./docs/deployment-safety.md).

From a trusted local machine with `terraform` and `gcloud` installed:

```bash
npm run deploy:cloudrun:check
npm run deploy:cloudrun:validate -- --project YOUR_PROJECT_ID --region CLOUD_RUN_REGION --image YOUR_CONTAINER_IMAGE_URI --invoker user:you@example.com
npm run deploy:cloudrun:plan -- --project YOUR_PROJECT_ID --region CLOUD_RUN_REGION --image YOUR_CONTAINER_IMAGE_URI --invoker user:you@example.com
npm run deploy:cloudrun:apply -- --project YOUR_PROJECT_ID --region CLOUD_RUN_REGION --image YOUR_CONTAINER_IMAGE_URI --invoker user:you@example.com
```

After deploy, print the private validation commands:

```bash
npm run deploy:cloudrun:validation-commands -- --project YOUR_PROJECT_ID --region CLOUD_RUN_REGION --image YOUR_CONTAINER_IMAGE_URI --invoker user:you@example.com
```

The service stays non-public by default. Validation is intended to happen with either `gcloud run services proxy` or `curl` plus an identity token.

See [docs/cloud-run-backend-deployment.md](./docs/cloud-run-backend-deployment.md) for the full runbook.

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
- `npm run deploy:firestore:check` checks Terraform and local ADC prerequisites for Wave 8
- `npm run deploy:firestore:init -- --project ... --location ...` initializes the Wave 8 Terraform root
- `npm run deploy:firestore:validate -- --project ... --location ...` runs `fmt`, `init`, and `validate`
- `npm run deploy:firestore:plan -- --project ... --location ...` writes a reviewable Terraform plan for hosted Firestore provisioning
- `npm run deploy:firestore:apply -- --project ... --location ...` applies the reviewed Terraform plan after explicit confirmation
- `npm run deploy:firestore:config-check` verifies that the Terraform config still reuses the repo-managed `firestore.rules` file
- `npm run deploy:cloudrun:check` checks Terraform and local ADC prerequisites for Wave 9 Cloud Run deployment
- `npm run deploy:cloudrun:init -- --project ... --region ... --image ... --invoker ...` initializes the Wave 9 Terraform root
- `npm run deploy:cloudrun:validate -- --project ... --region ... --image ... --invoker ...` runs `fmt`, `init`, and `validate` for the Cloud Run backend root
- `npm run deploy:cloudrun:plan -- --project ... --region ... --image ... --invoker ...` writes a reviewable Terraform plan for private Cloud Run backend deployment
- `npm run deploy:cloudrun:apply -- --project ... --region ... --image ... --invoker ...` applies the reviewed Cloud Run plan after explicit confirmation
- `npm run deploy:cloudrun:validation-commands -- --project ... --region ... --image ... --invoker ...` prints private-service validation commands for the deployed backend
- `npm run deploy:cloudrun:config-check` verifies that the Wave 9 Terraform config keeps the service private by default
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
- repo-managed Firestore provisioning for an existing hosted GCP project
- repo-managed Cloud Run backend deployment for an existing hosted GCP project

It intentionally does not include hosted frontend integration, Firebase Auth browser flow, final backend API design, submission/grading integration, App Check, Cloud Armor, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
