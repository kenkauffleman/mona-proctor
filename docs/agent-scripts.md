# Agent Script Guide

This file is for agents working in the repo.
It summarizes the current npm scripts, when to use them, and what each one is meant to validate.

## General guidance
- Start with the smallest script that proves the current phase goal.
- Do not use Firestore emulator scripts to justify backend-container or frontend integration work yet.
- In Codespaces or another remote container, remember that `0.0.0.0` bindings may still require port forwarding or the browser preview URL.
- Before finishing non-trivial work, run the relevant tests plus `npm run lint` and `npm run typecheck`.
- For hosted deployment waves, prefer the repo's human-run deploy scripts over ad hoc `terraform` commands.

## Core development scripts

### `npm install`
- Installs repo dependencies.
- Run this before using any other script in a fresh environment.

### `npm run dev`
- Starts the Wave 7 local prototype stack:
  - Vite frontend on a container-friendly host
  - Firestore-backed backend history API on port `8081`
- Use this for the browser client ↔ backend ↔ Firestore vertical slice.
- Pair it with `npm run emulator:firestore` when you want the browser flow working against the local Firestore emulator.

### `npm run dev:web`
- Starts only the Vite frontend.
- Use when working only on frontend behavior or UI.

### `npm run dev:api`
- Starts only the Wave 7 backend history API with Firestore-emulator settings.
- Use when working only on the backend history API or Firestore persistence behavior.

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

## Backend container validation scripts

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
- Builds the Wave 5 backend validation image from [backend/Dockerfile](/workspaces/mona-proctor/backend/Dockerfile).
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
- Use this for backend container ↔ emulator proof, not the older SQLite/API flow.

### `npm run wave7:validate`
- Alias for the repeatable non-Docker Wave 7 round-trip validation.
- Use this when you want the fastest pass/fail check for append → Firestore persistence → load → replay reconstruction.

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
- Use after code changes that affect app logic, Phase 3 server behavior, the Wave 5 backend validation service, or shared utilities.

### `npm run lint`
- Runs ESLint across the repo.
- Required before finishing non-trivial changes.

### `npm run typecheck`
- Runs TypeScript project checks.
- Required before finishing non-trivial changes.

### `npm run build`
- Builds the app and runs TypeScript project references as part of the build.
- Useful as an additional confidence check, but not always necessary for narrow changes if tests, lint, and typecheck already cover the changed area.

## Wave 8 deployment scripts

### `npm run deploy:firestore:check`
- Checks that `terraform` and `gcloud` are installed locally.
- Confirms that Application Default Credentials are available through `gcloud`.
- Use this first on the human operator's machine before any Terraform command.

### `npm run deploy:firestore:init -- --project ... --location ...`
- Runs `terraform init` for the Wave 8 Firestore Terraform root.
- Prints the target project and Firestore location before doing any work.
- The deploy scripts also auto-load `.env.firestore` if present, so the flags are optional once that file is filled in.

### `npm run deploy:firestore:validate -- --project ... --location ...`
- Runs `terraform fmt -check`, `terraform init`, and `terraform validate`.
- This is the preferred repeatable validation command before planning changes.
- The deploy scripts also auto-load `.env.firestore` if present, so the flags are optional once that file is filled in.

### `npm run deploy:firestore:plan -- --project ... --location ...`
- Runs `terraform plan` for the existing project and writes a saved plan file to `infra/terraform/firestore/firestore.tfplan`.
- Use this for the reviewable human-in-the-loop plan step.
- The deploy scripts also auto-load `.env.firestore` if present, so the flags are optional once that file is filled in.

### `npm run deploy:firestore:apply -- --project ... --location ...`
- Applies the previously saved Terraform plan file only after an explicit `APPLY` confirmation.
- This is intentionally separate from `plan` and does not auto-plan for you.
- The deploy scripts also auto-load `.env.firestore` if present, so the flags are optional once that file is filled in.

### `npm run deploy:firestore:config-check`
- Runs a small repo-side check that the Terraform config still references the shared [`firestore.rules`](/workspaces/mona-proctor/firestore.rules) file and the expected Firestore resources.
- Use this as a lightweight regression check when editing the Wave 8 infrastructure config.

## Wave 9 deployment scripts

### `npm run deploy:cloudrun:check`
- Checks that `terraform` and `gcloud` are installed locally.
- Confirms that Application Default Credentials are available through `gcloud`.
- Use this first on the human operator's machine before any Wave 9 Terraform command.

### `npm run deploy:cloudrun:init -- --project ... --region ... --image ... --invoker ...`
- Runs `terraform init` for the Wave 9 Cloud Run backend Terraform root.
- Prints the target project, region, service name, image, and private invoker principal before doing any work.
- The deploy scripts also auto-load `.env.cloudrun` if present, so the flags are optional once that file is filled in.

### `npm run deploy:cloudrun:validate -- --project ... --region ... --image ... --invoker ...`
- Runs `terraform fmt -check`, `terraform init`, and `terraform validate`.
- This is the preferred repeatable validation command before planning Cloud Run changes.
- The deploy scripts also auto-load `.env.cloudrun` if present, so the flags are optional once that file is filled in.

### `npm run deploy:cloudrun:plan -- --project ... --region ... --image ... --invoker ...`
- Runs `terraform plan` for the Cloud Run backend root and writes a saved plan file to `infra/terraform/cloud-run-backend/cloud-run-backend.tfplan`.
- Use this for the reviewable human-in-the-loop plan step.
- The deploy scripts also auto-load `.env.cloudrun` if present, so the flags are optional once that file is filled in.

### `npm run deploy:cloudrun:apply -- --project ... --region ... --image ... --invoker ...`
- Applies the previously saved Terraform plan file only after an explicit `APPLY` confirmation.
- This is intentionally separate from `plan` and does not auto-plan for you.
- The deploy scripts also auto-load `.env.cloudrun` if present, so the flags are optional once that file is filled in.

### `npm run deploy:cloudrun:validation-commands -- --project ... --region ... --image ... --invoker ...`
- Prints the human-usable private validation commands for the deployed Cloud Run service.
- Includes both a `gcloud run services proxy` workflow and a `curl` workflow using `gcloud auth print-identity-token`.
- Use this after deploy when you want a copy-paste validation path without making the service public.

### `npm run deploy:cloudrun:config-check`
- Runs a small repo-side check that the Cloud Run Terraform config still uses a private invoker binding and does not grant public access.
- Use this as a lightweight regression check when editing the Wave 9 infrastructure config.
