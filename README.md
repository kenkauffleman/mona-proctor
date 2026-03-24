# mona-proctor

Phase 2 currently provides a minimal web app with:

- an editable Monaco record editor that starts empty
- an in-memory edit event log
- a Monaco replay editor on the same page that starts empty
- a watch replay action that rebuilds the document at the original input speed
- language switching for Python, JavaScript, and Java

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

## Phase 2 scope

This slice intentionally includes only:

- app shell
- Monaco editor integration
- local in-memory source state
- Monaco content-change recording
- deterministic in-browser replay from an empty document
- time-based watch replay using recorded timestamps
- a debug event log

It intentionally does not include backend submission, storage, grading, auth, replay, or admin features yet.

Prototype event shape details live in [docs/history-prototype.md](./docs/history-prototype.md).
