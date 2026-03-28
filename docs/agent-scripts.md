# Agent Script Guide

This file is for agents working in the repo.
It summarizes the current npm scripts, when to use them, and what each one is meant to validate.

## General guidance
- Start with the smallest script that proves the current phase goal.
- Do not use Firestore emulator scripts to justify backend-container or frontend integration work yet.
- In Codespaces or another remote container, remember that `0.0.0.0` bindings may still require port forwarding or the browser preview URL.
- Before finishing non-trivial work, run the relevant tests plus `npm run lint` and `npm run typecheck`.
- For hosted deployment waves, prefer the repo's human-run deploy scripts over ad hoc `terraform` commands.
- When documenting or handing off human-facing hosted validation/deploy commands, include `--env <name>` explicitly and use `prod` where the command is production-facing.
- For Wave 10 local auth work, prefer the repo's emulator and seed scripts instead of manually creating Auth emulator users.

## Core development scripts

### `npm install`
- Installs repo dependencies.
- Run this before using any other script in a fresh environment.

### `npm run dev`
- Starts the current local authenticated app stack:
  - Vite frontend on a container-friendly host
  - Firebase-authenticated backend API on port `8081`
- Use this for the browser client ↔ backend ↔ Firestore vertical slice after the local emulators are already running.
- Pair it with `npm run emulator:local`, `npm run auth:seed`, and `npm run execution:container:build` when you want the authenticated browser flow with real local Python execution working locally.

### `npm run dev:web`
- Starts only the Vite frontend.
- Use when working only on frontend behavior or UI.

### `npm run dev:api`
- Starts only the backend API with Firestore/Auth emulator settings and the local-container execution backend.
- Use when working on backend token verification, authorization, Firestore persistence behavior, or real local Python execution dispatch.

### `npm run preview`
- Serves the built frontend preview on a container-friendly host.
- Use only when you specifically need to inspect the production build locally.

## Firestore emulator scripts

### `npm run emulator:firestore`
- Starts the Firestore emulator and Firebase Emulator UI.
- Intended for manual local inspection or to support a separately started backend container.
- Expected endpoints:
  - Firestore emulator: `0.0.0.0:8080`
  - Emulator UI: `127.0.0.1:4000/firestore`
- This is the long-running command to use when you want the UI available.

### `npm run emulator:local`
- Starts both the Firestore and Firebase Auth emulators plus the Firebase Emulator UI.
- Use this for the full Wave 10 local authenticated flow.
- Expected endpoints:
  - Firestore emulator: `0.0.0.0:8080`
  - Auth emulator: `0.0.0.0:9099`
  - Emulator UI: `0.0.0.0:4000`

### `npm run auth:seed`
- Creates the default local email/password users in the running Auth emulator.
- Run this after `npm run emulator:local`.
- Default users created:
  - `student1@example.com` / `pass1234`
  - `student2@example.com` / `pass1234`
- You can override those defaults by setting `AUTH_SEED_USERS_JSON` in the shell before running the script.

### `npm run emulator:firestore:check`
- Starts the Firestore emulator, runs the trivial read/write sanity check, then shuts the emulator down.
- Use this for repeatable validation in a non-interactive workflow.
- This validates the emulator directly, without involving the backend container.
- This is the preferred script when you only need a pass/fail connectivity check.

### `npm run emulator:firestore:manualcheck`
- Runs the same sanity check as `emulator:firestore:check`, but prints the fetched document to the console.
- If no emulator is running yet, it starts one and keeps it running so the UI can be inspected manually.
- If an emulator is already running on the expected port, it reuses it, prints the fetched record, and leaves it running.
- This is still a direct emulator sanity check, not a backend-container validation.
- Use this when you want both console confirmation and manual UI inspection of the written record.

### `npm run manual:local`
- Starts the full long-running local manual validation stack.
- Waits for the Firestore and Auth emulators to finish starting before seeding the default local users.
- Builds the local Python runner image, then starts the backend API and Vite frontend.
- Use this when you want one command for manual browser verification of sign-in, history upload, replay, and Python execution.

## Backend and local validation scripts

### `npm run backend:dev`
- Starts the Wave 7 backend history service directly with `tsx`.
- Sets `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` for the normal local emulator workflow.
- Use this only for quick local backend iteration outside Docker.
- This does not prove the container runtime shape by itself.

### `npm run backend:api:exercise`
- Calls the Wave 7 history append/load endpoints on a backend that is already running.
- Defaults to `http://127.0.0.1:8081` and writes a tiny manual smoke-test session.
- Use this when you want to exercise the backend API seam without the browser, either against `npm run backend:dev` or a separately started container.
- You can override the target with `BACKEND_BASE_URL=http://... npm run backend:api:exercise`.

### `npm run backend:api:validate`
- Starts the Firestore emulator, boots the backend directly with `tsx`, appends two history batches through the API, loads the session back, verifies deterministic replay reconstruction, checks Firestore metadata/batch separation, and shuts everything down.
- This is the preferred repeatable Wave 7 validation script when Docker is not part of what you are trying to prove.
- Use this to validate the backend API seam plus Firestore persistence independently of the browser page.

### `npm run backend:build`
- Compiles the backend service to `dist/backend`.
- Use this before local runtime inspection or as part of container build troubleshooting.

### `npm run backend:container:build`
- Builds the backend image from [backend/Dockerfile](/workspaces/mona-proctor/backend/Dockerfile).
- Requires a local Docker-compatible runtime.
- Use this when you want to inspect or rerun the container manually.

### `npm run backend:container:run`
- Runs the already-built backend container on port `8081`.
- Expects a Firestore emulator to already be available on the host.
- Requires a local Docker-compatible runtime.
- This is the manual backend container ↔ emulator path for the Wave 7 history API.
- Pair this with `npm run backend:api:exercise` when you want to hit the HTTP endpoint manually without the frontend.

### `npm run backend:container:validate`
- Starts the Firestore emulator, builds the backend container, runs it, calls the Wave 7 history append endpoint, and shuts everything down.
- Requires a local Docker-compatible runtime.
- This is the preferred repeatable container-shaped validation script for the Wave 7 backend path.
- Use this for backend container ↔ emulator proof of the current backend path.

### `npm run wave7:validate`
- Alias for the repeatable non-Docker Wave 7 round-trip validation.
- Use this when you want the fastest pass/fail check for append → Firestore persistence → load → replay reconstruction.

### `npm run wave10:validate`
- Starts the Firestore and Auth emulators, seeds local users, boots the backend directly with `tsx`, signs in through the Auth emulator, appends and loads authenticated history, verifies `ownerUid` persistence in Firestore, verifies cross-user access rejection, and shuts everything down.
- This is the preferred repeatable Wave 10 validation script.
- Use this to validate sign-in → ID token acquisition → backend verification → ownership enforcement.

### `npm run wave7:manual`
- Starts the Firestore emulator and UI, builds and runs the backend in its Docker container, and starts the Vite client.
- Use this when you want to manually type in the browser, open the replay page, and inspect stored documents in the Firestore UI.
- Expected local URLs:
  - client: `http://127.0.0.1:5173`
  - backend: `http://127.0.0.1:8081`
  - Firestore UI: `http://127.0.0.1:4000/firestore`
- In Codespaces, make sure the forwarded ports for `5173`, `8081`, and `4000` are accessible.

## Verification scripts

### `npm test`
- Runs the Vitest suite.
- Use after code changes that affect app logic, backend behavior, or shared utilities.

### `npm run test:unit`
- Runs the Wave 14 unit and component Vitest suite under `src/` and `backend/`.
- Use this for fast feedback on frontend behavior, backend request handling, and shared local logic.
- This is the preferred first verification step before the emulator-backed layers.

### `npm run test:integration`
- Starts the Firestore and Auth emulators and runs the integration Vitest suite under `tests/integration/`.
- Validates authenticated backend/API behavior, Firestore persistence, local auth ownership checks, and local-container Python execution.
- This is the preferred repeatable emulator-backed validation layer for Wave 14 backend/auth/Firestore/execution seams.

### `npm run test:e2e`
- Starts the Firestore and Auth emulators, launches a local frontend/backend test stack, builds the local Python runner image, and runs Playwright.
- Covers a small set of high-value local browser flows:
  - authenticated happy path
  - execution submission/result display
  - one important local guardrail
  - one authorization sanity check
- Use this for Wave 14 local browser confidence, not for broad UI coverage.

### `npm run test:local`
- Runs `npm run test:unit`, `npm run test:integration`, and `npm run test:e2e` in sequence.
- Use this when you want the full Wave 14 local validation stack in one command.
- This is slower, but it is the clearest one-command local confidence check before finishing significant Wave 14 work.

### `npm run lint`
- Runs ESLint across the repo.
- Required before finishing non-trivial changes.

### `npm run typecheck`
- Runs TypeScript project checks.
- Required before finishing non-trivial changes.

### `npm run build`
- Builds the app and runs TypeScript project references as part of the build.
- Useful as an additional confidence check, but not always necessary for narrow changes if tests, lint, and typecheck already cover the changed area.

## Hosted deployment scripts

### `npm run deploy -- adopt --env <name>`
- Checks that local Application Default Credentials are ready.
- Imports existing Firestore resources plus hosted Firebase singleton resources into the unified hosted Terraform state.
- Use this once per environment during migration, not as part of the normal steady-state deploy loop.

### `npm run deploy -- build --env <name>`
- Preferred first step for hosted environments like `test` and `prod`.
- Bootstraps Cloud Run-side APIs and the Artifact Registry repository through the single hosted Terraform root.
- Builds the backend container from [backend/Dockerfile](/workspaces/mona-proctor/backend/Dockerfile) and pushes it to Artifact Registry.

### `npm run deploy -- seed-auth --env <name>`
- Creates or updates the hosted Firebase email/password users listed in `AUTH_SEED_USERS_JSON`.
- Uses Application Default Credentials and the repo's Firebase Admin-based seeding script.
- Run this after Terraform has configured hosted Firebase Auth and before the hosted auth validator.

### `npm run deploy -- validate --env <name>`
- Checks that local Application Default Credentials are ready.
- Runs `npm test`, `npm run lint`, and `npm run typecheck`.
- Runs the hosted Terraform config check, `terraform fmt -check`, `terraform init`, and `terraform validate`.
- Use this before planning hosted changes.

### `npm run deploy -- plan --env <name>`
- Checks that local Application Default Credentials are ready.
- Generates one Terraform plan for the entire hosted vertical slice.
- Uses the single hosted Terraform root under [infra/terraform/hosted](/workspaces/mona-proctor/infra/terraform/hosted).
- Writes the saved plan file to `infra/terraform/hosted/hosted.tfplan`.

### `npm run deploy -- deploy --env <name>`
- Checks that local Application Default Credentials are ready.
- Applies the previously reviewed hosted plan file.
- Renders the hosted frontend's Firebase/Auth/API runtime values from Terraform outputs.
- Builds the static frontend and deploys it to Firebase Hosting.
- Runs the hosted Wave 11 auth validation after apply.

### `npm run hosted:frontend:env`
- Writes a local env file for the hosted frontend build using Terraform outputs from `infra/terraform/hosted`.
- Used by the hosted deploy flow before `npm run build`.

### `npm run hosted:auth:seed`
- Runs the hosted Firebase Auth user seeding script directly.
- Use this only when you want the lower-level command outside the top-level deploy wrapper.

### `npm run hosted:auth:delete`
- Deletes the hosted Firebase Auth users listed in `AUTH_SEED_USERS_JSON`.
- Useful for one-off cleanup when a previously seeded account should no longer exist.

### `npm run wave11:validate`
- Validates the hosted Firebase-authenticated frontend/API/Firestore flow using Terraform outputs from the hosted root.
- Confirms the hosted frontend is reachable, signs in through hosted Firebase Auth, appends and loads history with Firebase ID tokens, and checks at least one denied case.

### `npm run execution:container:validate`
- Starts the Firestore emulator, seeds a queued execution record, builds the Python runner container, runs it against the emulator, verifies that the stored execution result becomes terminal, and shuts everything down.
- This is the preferred repeatable local validation for the Wave 12 execution container before relying on hosted Cloud Run Jobs.
- Requires a local Docker-compatible runtime.

### `npm run execution:container:build`
- Builds the local Python runner image used by the `local-container` execution backend.
- Use this before `npm run dev` if you want the browser flow to execute Python locally through Docker instead of failing with a missing image error.

### `npm run execution:submit -- --email <email> --password <password> --source-file <path>`
- Reads hosted Terraform outputs, signs in through hosted Firebase Auth, and submits a Python execution job to the hosted backend.
- Prints the created execution record as JSON.
- You can use `--source <code>` instead of `--source-file <path>`.

### `npm run execution:get -- --email <email> --password <password> --job-id <id>`
- Reads hosted Terraform outputs, signs in through hosted Firebase Auth, and fetches a stored execution record from the hosted backend.
- Add `--wait` to poll until a terminal result is available.

### `npm run wave12:validate`
- Validates the hosted Wave 12 Python execution prototype using Terraform outputs from the hosted root.
- Signs in with a seeded hosted Firebase user, submits `print("wave12 ok")`, polls until completion, and verifies the stored result contract.
- Use this after the human operator has deployed both the backend service and the execution job image.

### `npm run wave13:validate`
- Starts the Firestore and Auth emulators, builds the local Python runner image, boots the backend in `local-container` mode, signs in through the Auth emulator, submits Python execution through the authenticated API, waits for the Docker-backed local runner to write the terminal Firestore result, fetches that result back through both the job-id and latest-job endpoints, verifies Firestore persistence, checks runner logs, and validates a denied cross-user case.
- This is the preferred repeatable local validation script for the Wave 13 UI-facing execution integration.
- Use this before relying on hosted/manual validation for the integrated Python execution flow.
