# mona-proctor

Phase 3 currently provides a local client/server history prototype with:

- a recording page backed by Monaco content-change events
- a client-generated UUID for each recording session
- periodic history batch uploads to a local backend API
- SQLite-backed session history storage
- a replay page that loads history by UUID and reconstructs the final source
- deterministic timed replay from backend-loaded history

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both the Vite frontend and the local history API backend. The frontend binds to `0.0.0.0`, which works well in Codespaces or other remote container environments, and proxies `/api` requests to the backend on port `3001`.

## Available scripts

- `npm run dev` starts the frontend and backend together
- `npm run dev:web` starts only the Vite frontend
- `npm run dev:api` starts only the history API backend
- `npm run build` creates a production build
- `npm run typecheck` runs TypeScript project checks
- `npm test` runs the test suite
- `npm run lint` runs ESLint

## Phase 3 scope

This slice intentionally includes:

- local recording and replay demo pages
- simple append-oriented history API endpoints
- SQLite persistence for ordered session events
- deterministic reconstruction from backend-loaded history alone
- tests for batching, API behavior, storage, and replay reconstruction

It intentionally does not include submission/grading integration, auth, cloud deployment, or advanced replay controls yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
