# Hosted Deployment Runbook

This runbook covers the unified hosted deployment workflow for the current vertical slice.

## Scope
- provision hosted Firestore
- provision Artifact Registry for backend images
- deploy the backend/API to private Cloud Run
- validate the private Cloud Run service all the way through Firestore

This wave does not host the frontend, add browser auth, make the backend public, or add App Check / Cloud Armor.

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

## Required commands
From a trusted local machine with `terraform` and `gcloud` installed:

```bash
npm run deploy -- build --env test
npm run deploy -- validate --env test
npm run deploy -- plan --env test
npm run deploy -- deploy --env test
```

Swap `test` for `prod` when you want the production environment.

## What each command does

### `npm run deploy -- build --env <name>`
- loads the selected local env file
- bootstraps required APIs and Artifact Registry through Terraform
- builds the backend image from `backend/Dockerfile`
- pushes the image to the Terraform-managed Artifact Registry repository

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
- does not silently re-plan
- runs the private Cloud Run end-to-end validation afterward

## Private validation flow
The deploy step finishes by running the private history round-trip validator.

That validator:
- finds the private Cloud Run URL with `gcloud`
- gets an identity token with `gcloud auth print-identity-token`
- appends two history batches through the private Cloud Run backend
- loads the session back through the same backend
- verifies the replayed source matches the expected result

Your operator identity must have `roles/run.invoker` on the Cloud Run service. The hosted Terraform config grants that to the configured invoker principal.

## Safety notes
- Terraform manages API enablement, Firestore, Artifact Registry, and Cloud Run in one hosted root.
- The backend remains private by default.
- The build step is outside Terraform, but it is part of the same top-level operator workflow.
- The deploy step applies a saved plan rather than silently recalculating changes.
