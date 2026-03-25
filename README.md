# mona-proctor

Wave 5 is focused on proving that a lightweight backend, running in a local container shape, can connect to the local Firestore emulator and complete a trivial read/write.

The repo currently provides:

- a recording page backed by Monaco content-change events
- a client-generated UUID for each recording session
- periodic history batch uploads to a local backend API
- SQLite-backed session history storage
- a replay page that loads history by UUID and reconstructs the final source
- deterministic timed replay from backend-loaded history
- a local Firestore emulator setup for early datastore validation
- a minimal TypeScript backend validation service for container-to-emulator checks

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local history API backend. The frontend binds to `0.0.0.0`, which works well in Codespaces or other remote container environments, and proxies `/api` requests to the backend on port `3001`.

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

These Phase 4-style scripts validate the emulator directly and do not involve the backend container.

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
```

## Available scripts

- `npm run dev` starts the frontend and backend together
- `npm run dev:web` starts only the Vite frontend
- `npm run dev:api` starts only the history API backend
- `npm run backend:dev` starts only the Firestore-validation backend outside Docker
- `npm run backend:build` compiles the backend validation service to `dist/backend`
- `npm run backend:container:build` builds the local backend validation container image
- `npm run backend:container:run` runs the built backend container against a local Firestore emulator
- `npm run backend:container:validate` runs the repeatable container-to-emulator validation flow
- `npm run emulator:firestore` starts the local Firestore emulator and Emulator UI
- `npm run emulator:firestore:check` runs the emulator-backed read/write sanity check
- `npm run emulator:firestore:manualcheck` runs the same sanity check, prints the fetched document, and keeps the emulator UI running
- `npm run build` creates a production build
- `npm run typecheck` runs TypeScript project checks
- `npm test` runs the test suite
- `npm run lint` runs ESLint

## Wave 5 scope

This slice intentionally includes:

- local recording and replay demo pages
- simple append-oriented history API endpoints
- SQLite persistence for ordered session events
- deterministic reconstruction from backend-loaded history alone
- local Firestore emulator configuration
- a scriptable emulator-backed read/write validation path
- a minimal Express + Firebase Admin backend validation path
- a local container workflow aligned with the likely future Cloud Run runtime shape
- tests for batching, API behavior, storage, and replay reconstruction

It intentionally does not include frontend integration with the new backend, final backend API design, submission/grading integration, auth, hosted deployment, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
