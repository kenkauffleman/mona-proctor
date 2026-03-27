# Hosted Deployment Runbook

This runbook covers the unified hosted deployment workflow for the current vertical slice.

## Scope
- provision hosted Firestore
- provision hosted Firebase Auth configuration for email/password sign-in
- provision a Firebase web app for the hosted frontend build
- provision Artifact Registry for backend images
- deploy the backend/API to Cloud Run for browser-reachable authenticated requests
- deploy the static frontend to Firebase Hosting
- validate the hosted browser-style auth flow through the backend and Firestore

This wave does not add App Check, Cloud Armor, or custom domains.

## Local operator config
The hosted workflow is environment-based.

Use one of the checked-in example env files:

```bash
cp .env.deploy.test.example .env.deploy.test
cp .env.deploy.prod.example .env.deploy.prod
```

The checked-in Terraform environment files live at:
- `infra/terraform/hosted/environments/test.tfvars`
- `infra/terraform/hosted/environments/prod.tfvars`

The deploy scripts always target the single hosted Terraform root and then override the checked-in tfvars values with your local env file values.

For this phase, keep:

```bash
FIRESTORE_DATABASE_NAME="(default)"
DEPLOY_QUOTA_PROJECT_ID="<same-as-deploy-project-id>"
```

The hosted workflow does not support switching to another Firestore database name during Wave 11.

The hosted Terraform providers now explicitly set `billing_project` and `user_project_override = true` to work around quota-project issues with some client-based Google APIs such as Identity Toolkit. Keep `DEPLOY_QUOTA_PROJECT_ID` pointed at the same project unless you have a specific reason to separate quota attribution.

## Required commands
From a trusted local machine with `terraform` and `gcloud` installed:

```bash
npm run deploy -- adopt --env test
npm run deploy -- build --env test
npm run deploy -- validate --env test
npm run deploy -- plan --env test
npm run deploy -- seed-auth --env test
npm run deploy -- deploy --env test
```

Swap `test` for `prod` when you want the production environment.

## What each command does

### `npm run deploy -- adopt --env <name>`
- checks that local Application Default Credentials are ready
- imports existing Firestore resources from the old split Terraform setup into the new unified hosted Terraform state
- is a one-time migration step per environment, not part of the normal steady-state deploy loop

### `npm run deploy -- build --env <name>`
- loads the selected local env file
- bootstraps Cloud Run-side APIs and Artifact Registry through Terraform
- builds the backend image from `backend/Dockerfile`
- pushes the image to the Terraform-managed Artifact Registry repository

### `npm run deploy -- seed-auth --env <name>`
- uses the hosted Firebase project through Application Default Credentials
- creates or updates the default Wave 11 email/password users
- keeps the human validation flow repeatable without storing credentials in the repo

### `npm run deploy -- validate --env <name>`
- checks that local Application Default Credentials are ready
- runs `npm test`
- runs `npm run lint`
- runs `npm run typecheck`
- runs the hosted Terraform config check
- runs `terraform fmt -check`
- runs `terraform init`
- runs `terraform validate`

### `npm run deploy -- plan --env <name>`
- checks that local Application Default Credentials are ready
- runs one Terraform plan for the whole hosted slice
- uses the single hosted state and the selected environment tfvars
- writes the saved plan to `infra/terraform/hosted/hosted.tfplan`

### `npm run deploy -- deploy --env <name>`
- checks that local Application Default Credentials are ready
- applies the previously reviewed Terraform plan
- renders the frontend Firebase/Auth/API runtime config from Terraform outputs
- builds the static frontend
- deploys the static frontend to Firebase Hosting
- runs the hosted authenticated validation afterward

## Hosted auth design
Wave 11 intentionally changes the backend exposure model:

- Cloud Run is browser-reachable at the network layer so the hosted frontend can call it directly.
- Meaningful history access still requires a Firebase ID token on every `/api/history/...` request.
- The backend verifies Firebase ID tokens with `firebase-admin`.
- Ownership-based authorization from Wave 10 is unchanged.
- CORS is explicitly limited to:
  - `https://<project-id>.web.app`
  - `https://<project-id>.firebaseapp.com`

This wave deliberately does not rely on Cloud Run IAM as the browser auth mechanism.

## Hosted validation flow
The deploy step finishes by running the hosted auth validator.

That validator:
- reads the Firebase web app config and backend URL from Terraform outputs
- fetches the hosted frontend origin to confirm Hosting is serving the app
- signs in the default hosted users through Firebase Auth using email/password
- sends Firebase ID tokens to the hosted backend with the hosted frontend `Origin`
- appends and reloads history through the backend
- verifies replay reconstruction through Firestore-backed data
- verifies cross-user access denial with a second user
- verifies an unauthenticated request is rejected

## Human validation after deploy
After `npm run deploy -- deploy --env test`, open the hosted frontend in a browser:

```text
https://<project-id>.web.app
```

Then:
1. Sign in as `student1@example.com` / `pass1234`.
2. Type in the editor and wait for a successful sync.
3. Open the replay page for the same session and verify it loads.
4. Sign out and sign back in as `student2@example.com` / `pass1234`.
5. Try loading the first session UUID and confirm the backend denies access.

## Safety notes
- Terraform manages Firestore, Firebase Auth configuration, the Firebase web app, Artifact Registry, and Cloud Run in one hosted root.
- Firebase Hosting serves the static frontend, but the static asset deploy itself is still a human-run step after Terraform apply.
- The deploy step applies a saved plan rather than silently recalculating changes.
- Hosted users are seeded by a human-run script and are not stored in Terraform state.
