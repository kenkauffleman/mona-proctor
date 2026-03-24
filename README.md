# mona-proctor

Phase 1 currently provides a minimal web app with a Monaco editor page for:

- Python
- JavaScript
- Java

## Run locally

```bash
npm install
npm run dev
```

The Vite dev server binds to `0.0.0.0`, which works well in Codespaces or other remote container environments.

## Available scripts

- `npm run dev` starts the app
- `npm run build` creates a production build
- `npm test` runs the test suite
- `npm run lint` runs ESLint

## Phase 1 scope

This slice intentionally includes only:

- app shell
- Monaco editor integration
- language switching
- local in-memory source state

It intentionally does not include backend submission, storage, grading, auth, replay, or admin features yet.
