# Firestore Provisioning Runbook

This runbook covers the Wave 8 human-in-the-loop workflow for provisioning Firestore in an existing GCP project.

## Scope
- use repo-managed Terraform to provision the default Firestore database
- publish Firestore rules from the repo's [`firestore.rules`](/workspaces/mona-proctor/firestore.rules) file
- keep planning, review, and apply as separate human-run steps

This wave does not create a new GCP project, deploy Cloud Run, or host the frontend.

## Minimal prerequisites
- an existing GCP project id you are allowed to modify
- permission to enable Firebase/Firestore-related services in that project
- `terraform` installed locally
- `gcloud` installed locally

The agent environment does not need live cloud credentials, service account keys, or secrets.

## Shared local operator config
If you do not want to repeat the project id and shared region on every command, create a local config file:

```bash
cp .env.deploy.example .env.deploy
```

Then fill in:
- `DEPLOY_PROJECT_ID`
- `DEPLOY_REGION`
- optionally `FIRESTORE_DATABASE_NAME` if you ever need a non-default override

The deploy scripts automatically load `.env.deploy` when present.
Explicit CLI flags still win, so you can override the file for one-off runs.

## Authentication flow
Run the auth steps from your trusted local machine:

```bash
gcloud auth login
gcloud auth application-default login
```

Terraform uses Application Default Credentials from the human operator's machine for this wave.

## Safe operator workflow
1. Check prerequisites:

```bash
npm run deploy -- firestore check
```

2. Validate the Terraform root for your target project and shared region:

```bash
npm run deploy -- firestore validate
```

Or, if you prefer explicit flags:

```bash
npm run deploy -- firestore validate -- --project YOUR_PROJECT_ID --region SHARED_REGION
```

3. Create a reviewable plan file:

```bash
npm run deploy -- firestore plan
```

Or, with explicit flags:

```bash
npm run deploy -- firestore plan -- --project YOUR_PROJECT_ID --region SHARED_REGION
```

4. Review the plan output carefully. Confirm that it only targets the existing project and the expected Firestore resources.

5. Apply the exact reviewed plan deliberately:

```bash
npm run deploy -- firestore apply
```

Or, with explicit flags:

```bash
npm run deploy -- firestore apply -- --project YOUR_PROJECT_ID --region SHARED_REGION
```

The apply script requires an explicit `APPLY` confirmation and reuses the saved plan file instead of replanning.

## What Terraform manages in Wave 8
- Firebase enabled on the existing project
- Firestore API and Firebase Rules API enabled
- the default Firestore database in Native mode
- a Firestore ruleset and `cloud.firestore` release sourced from [`firestore.rules`](/workspaces/mona-proctor/firestore.rules)

## Safety notes
- The Terraform config is scoped to an existing project only.
- The Firestore database resource uses safe defaults intended to reduce accidental destruction.
- The checked-in Firestore rules currently deny direct reads and writes by default. That is intentional until later auth-backed client access exists.
- The apply step is always separate from validation and planning.

## Validation after apply
- confirm the Terraform apply completed successfully
- run `terraform -chdir=infra/terraform/firestore output`
- verify in the GCP/Firebase UI that Firestore exists in the selected location
- confirm the active Firestore rules release matches the repo-managed rules file

## Minimal manual prerequisites that may still apply
- The existing GCP project must already exist.
- Billing/bootstrap/project-creation are outside this wave.
- Your human operator identity must already have permission to modify the target project.

## Rollback and cleanup considerations
- Firestore database location is effectively a one-time choice for the default database, so review it carefully before apply.
- The Terraform config is intentionally conservative about destroying the Firestore database.
- If later waves add more hosted resources, keep using the same reviewable `validate` → `plan` → `apply` flow instead of bypassing Terraform.
