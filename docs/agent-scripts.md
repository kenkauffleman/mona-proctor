# Agent Script Guide

This file is for agents working in the repo.
It summarizes the current npm scripts, when to use them, and what each one is meant to validate.

## General guidance
- Start with the smallest script that proves the current phase goal.
- Do not use Firestore emulator scripts to justify backend-container or frontend integration work yet.
- In Codespaces or another remote container, remember that `0.0.0.0` bindings may still require port forwarding or the browser preview URL.
- Before finishing non-trivial work, run the relevant tests plus `npm run lint` and `npm run typecheck`.

## Core development scripts

### `npm install`
- Installs repo dependencies.
- Run this before using any other script in a fresh environment.

### `npm run dev`
- Starts the Phase 3 local prototype stack:
  - Vite frontend on a container-friendly host
  - local Express history API backend
- Use this for the current Monaco/history client-server flow.
- Do not use this to validate Firestore integration.

### `npm run dev:web`
- Starts only the Vite frontend.
- Use when working only on frontend behavior or UI.

### `npm run dev:api`
- Starts only the local Express history API backend.
- Use when working only on the SQLite-backed history API behavior.

### `npm run preview`
- Serves the built frontend preview on a container-friendly host.
- Use only when you specifically need to inspect the production build locally.

## Firestore emulator scripts

### `npm run emulator:firestore`
- Starts the Firestore emulator and Firebase Emulator UI.
- Intended for manual local inspection.
- Expected endpoints:
  - Firestore emulator: `0.0.0.0:8080`
  - Emulator UI: `127.0.0.1:4000/firestore`
- This is the long-running command to use when you want the UI available.

### `npm run emulator:firestore:check`
- Starts the Firestore emulator, runs the trivial read/write sanity check, then shuts the emulator down.
- Use this for repeatable validation in a non-interactive workflow.
- This is the preferred script when you only need a pass/fail connectivity check.

### `npm run emulator:firestore:manualcheck`
- Runs the same sanity check as `emulator:firestore:check`, but prints the fetched document to the console.
- If no emulator is running yet, it starts one and keeps it running so the UI can be inspected manually.
- If an emulator is already running on the expected port, it reuses it, prints the fetched record, and leaves it running.
- Use this when you want both console confirmation and manual UI inspection of the written record.

## Verification scripts

### `npm test`
- Runs the Vitest suite.
- Use after code changes that affect app logic, server behavior, or shared utilities.

### `npm run lint`
- Runs ESLint across the repo.
- Required before finishing non-trivial changes.

### `npm run typecheck`
- Runs TypeScript project checks.
- Required before finishing non-trivial changes.

### `npm run build`
- Builds the app and runs TypeScript project references as part of the build.
- Useful as an additional confidence check, but not always necessary for narrow changes if tests, lint, and typecheck already cover the changed area.
