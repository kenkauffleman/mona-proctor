# Cloud Run Backend Deployment Runbook

This runbook covers the Wave 9 human-in-the-loop workflow for deploying the backend/API portion of the validated vertical slice to Cloud Run.

## Scope
- deploy the existing backend container to Cloud Run
- point the hosted backend at the existing hosted Firestore project
- keep the Cloud Run service private by default
- provide a repeatable human validation path for invoking the private service

This wave does not make the backend public, connect the hosted frontend, add Firebase Auth browser flow, or add App Check / Cloud Armor.

## Minimal prerequisites
- an existing GCP project with hosted Firestore already provisioned
- permission to enable Cloud Run-related services in that project
- `terraform` installed locally
- `gcloud` installed locally
- a backend container image URI that Cloud Run can pull
- an operator principal that should be allowed to invoke the private service for validation

The agent environment does not need live cloud credentials, service account keys, or secrets.

## Shared local operator config
To avoid repeating deployment inputs on every command, create a shared local config file:

```bash
cp .env.deploy.example .env.deploy
```

Then fill in:
- `DEPLOY_PROJECT_ID`
- `DEPLOY_REGION`
- `FIRESTORE_DATABASE_NAME`
- `CLOUDRUN_SERVICE_NAME`
- `CLOUDRUN_CONTAINER_IMAGE`
- `CLOUDRUN_INVOKER_PRINCIPAL`

The deploy scripts automatically load `.env.deploy` when present.
Explicit CLI flags still win, so you can override the file for one-off runs.

## Authentication flow
Run the auth steps from your trusted local machine:

```bash
gcloud auth login
gcloud auth application-default login
```

Terraform uses Application Default Credentials from the human operator's machine for this wave.

## Unified deploy entrypoint
The preferred operator entrypoint is now:

```bash
npm run deploy -- <target> <action>
```

Examples:
- `npm run deploy -- firestore validate`
- `npm run deploy -- firestore plan`
- `npm run deploy -- cloudrun build`
- `npm run deploy -- cloudrun validate`
- `npm run deploy -- cloudrun plan`
- `npm run deploy -- cloudrun apply`
- `npm run deploy -- cloudrun validate-private`

## Safe operator workflow
1. Check prerequisites:

```bash
npm run deploy -- cloudrun check
```

2. Build and push the backend image with Cloud Build:

```bash
npm run deploy -- cloudrun build
```

3. Validate the Terraform root for your target project, region, image, and invoker principal:

```bash
npm run deploy -- cloudrun validate
```

4. Create a reviewable plan file:

```bash
npm run deploy -- cloudrun plan
```

5. Review the plan output carefully. Confirm that it only targets the expected project and creates or updates the Cloud Run backend service plus a single invoker IAM binding for the named operator principal.

6. Apply the exact reviewed plan deliberately:

```bash
npm run deploy -- cloudrun apply
```

The apply script requires an explicit `APPLY` confirmation and reuses the saved plan file instead of replanning.

## What Terraform manages in Wave 9
- required Cloud Run-related project services
- a Cloud Run v2 service for the backend/API
- runtime environment variable `GCLOUD_PROJECT` so the backend uses the hosted Firestore project
- a single `roles/run.invoker` IAM binding for the operator principal used to validate the private service

The service is private by default because this Terraform root does not grant `allUsers` access.

## Private-service validation workflow
Your operator identity must be the same principal granted `roles/run.invoker`, or otherwise have equivalent private invocation permission.

You can print the current validation commands after deploy:

```bash
npm run deploy -- cloudrun validation-commands
```

Or run the full private round-trip validation script:

```bash
npm run deploy -- cloudrun validate-private
```

That validation script:
- fetches the private Cloud Run URL through `gcloud`
- gets an identity token through `gcloud auth print-identity-token`
- appends two history batches through the private Cloud Run service
- loads the stored session back through the private Cloud Run service
- verifies deterministic replay reconstruction of the returned events

### Option 1: Cloud Run proxy
Start a local proxy:

```bash
gcloud run services proxy mona-proctor-backend --project YOUR_PROJECT_ID --region SHARED_REGION --port 8080
```

Then call the private service locally:

```bash
curl http://127.0.0.1:8080/health
```

Expected response shape includes:
- `ok: true`
- `projectId: YOUR_PROJECT_ID`
- `firestoreEmulatorHost: null`
- Cloud Run metadata fields such as `cloudRunService` and `cloudRunRevision`

### Option 2: `curl` with an identity token
Fetch the service URL:

```bash
SERVICE_URL="$(gcloud run services describe mona-proctor-backend --project YOUR_PROJECT_ID --region SHARED_REGION --format='value(status.url)')"
```

Invoke with an identity token:

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" "${SERVICE_URL}/health"
```

If you want to exercise the history API manually, use the same auth pattern against:
- `POST ${SERVICE_URL}/api/history/sessions/SESSION_ID/batches`
- `GET ${SERVICE_URL}/api/history/sessions/SESSION_ID`

## Validation after apply
- confirm the Terraform apply completed successfully
- run `terraform -chdir=infra/terraform/cloud-run-backend output`
- confirm the Cloud Run service URL exists
- confirm the service requires authentication and is not publicly invokable
- call `/health` through either the proxy flow or identity-token flow
- confirm the response reports the hosted project id and `firestoreEmulatorHost: null`
- run `npm run deploy -- cloudrun validate-private` to confirm Cloud Run ↔ Firestore end-to-end persistence

## IAM notes for this phase
- The operator principal named in `invoker_principal` receives `roles/run.invoker` on the backend service.
- Additional deployment permissions for the human operator are still required outside the service runtime, such as the ability to manage Cloud Run and project services.
- Do not add `allUsers` or `allAuthenticatedUsers` during this wave just to simplify testing.

## Safety notes
- The apply step is always separate from validation and planning.
- The service stays private by default.
- The Terraform config sets low-cost scaling defaults for the prototype.
- Keep hosted validation human-operated until later auth-backed browser integration exists.

## Rollback and cleanup considerations
- Review image tags carefully before apply so you know exactly which backend build is being deployed.
- If you need to revoke private validation access, remove or change the `invoker_principal` Terraform input and rerun the normal `plan` → `apply` flow.
- Keep future frontend exposure and browser-auth work in later waves rather than loosening service IAM now.
