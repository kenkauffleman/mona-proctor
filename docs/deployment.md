# Production Deployment

This project uses a human-run deployment workflow.
Agents may prepare code, scripts, and docs, but a human should run the production commands from a trusted local environment with the right credentials.

## Prerequisites
- Application Default Credentials are configured locally for the human operator.
- Required local tools are installed:
  - `npm`
  - `terraform`
  - `firebase`
  - `docker`
- Production environment settings are available locally if needed through `.env.deploy.prod`.
- For safer backend rollouts, prefer `CLOUDRUN_IMAGE_TAG="auto"` in the deploy env file so the build step generates a fresh tag and the later plan/deploy steps reuse it automatically.

## Production deploy flow

Install dependencies:

```bash
npm install
```

Run the repo validation flow for `prod`:

```bash
npm run deploy -- validate --env prod
```

Build and prepare deploy artifacts for `prod`:

```bash
npm run deploy -- build --env prod
```

Create and review the Terraform plan for `prod`:

```bash
npm run deploy -- plan --env prod
```

Apply the reviewed production deploy:

```bash
npm run deploy -- deploy --env prod
```

## Production auth seeding
If the production environment needs the configured email/password users, run:

```bash
npm run deploy -- seed-auth --env prod
```

## Production validation
Before and after deployment, prefer explicit production-targeted checks:

```bash
npm run deploy -- validate --env prod
```

For the hosted Python execution prototype validation:

```bash
npm run wave12:validate
```

## Notes
- Do not run ad hoc production `terraform apply` commands outside the repo workflow unless there is an explicit documented exception.
- Review the plan output before `npm run deploy -- deploy --env prod`.
- Keep production commands explicit; do not omit `--env prod`.
