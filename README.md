# mona-proctor

Wave 4 is focused on a narrow local Firestore emulator sanity check while preserving the Phase 3 prototype.

The repo currently provides:

- a recording page backed by Monaco content-change events
- a client-generated UUID for each recording session
- periodic history batch uploads to a local backend API
- SQLite-backed session history storage
- a replay page that loads history by UUID and reconstructs the final source
- deterministic timed replay from backend-loaded history
- a local Firestore emulator setup for early datastore validation

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
```

## Available scripts

- `npm run dev` starts the frontend and backend together
- `npm run dev:web` starts only the Vite frontend
- `npm run dev:api` starts only the history API backend
- `npm run emulator:firestore` starts the local Firestore emulator and Emulator UI
- `npm run emulator:firestore:check` runs the emulator-backed read/write sanity check
- `npm run emulator:firestore:manualcheck` runs the same sanity check, prints the fetched document, and keeps the emulator UI running
- `npm run build` creates a production build
- `npm run typecheck` runs TypeScript project checks
- `npm test` runs the test suite
- `npm run lint` runs ESLint

## Wave 4 scope

This slice intentionally includes:

- local recording and replay demo pages
- simple append-oriented history API endpoints
- SQLite persistence for ordered session events
- deterministic reconstruction from backend-loaded history alone
- local Firestore emulator configuration
- a scriptable emulator-backed read/write validation path
- tests for batching, API behavior, storage, and replay reconstruction

It intentionally does not include backend-container integration, real frontend-to-Firestore flow, submission/grading integration, auth, cloud deployment, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
