# Deployment Safety Policy

This project is intentionally agent-assisted, but cloud changes must remain human-controlled.

## Core rule
Agents may generate and modify infrastructure code, deployment scripts, and documentation.

Agents must not be trusted with live cloud credentials, service account keys, or direct production deployment authority.

Cloud changes are prepared by the agent and executed by a human from a trusted local environment.

## Allowed agent work
Agents may:
- create and update Terraform files
- create and update Firebase configuration files
- create and update deployment and validation scripts
- create and update documentation
- run local validation
- prepare Terraform plans or plan commands for a human to run

Agents must assume they do not have live cloud credentials.

## Forbidden agent assumptions
Agents must not assume:
- service account key files are available in the repo
- secrets are stored in the repo
- manual console configuration will be used unless explicitly documented
- broad IAM roles are acceptable “just to get things working”
- resources should be publicly accessible by default

## Deployment workflow
1. Agent prepares infrastructure code and deployment scripts.
2. Human reviews the changes locally.
3. Human runs validation commands locally.
4. Human runs Terraform plan locally.
5. Human reviews the plan output.
6. Human runs Terraform apply locally only after explicit approval.
7. Human verifies deployment results.

## Terraform expectations
Infrastructure code should be designed for reviewable, repeatable execution.

Preferred workflow:
- `terraform fmt`
- `terraform validate`
- `terraform plan`
- human review
- `terraform apply`

Deployment scripts should default to safe behavior and should not apply changes automatically unless a human explicitly opts in.

## Credential and identity policy
- No long-lived cloud credentials or service account keys in the repo.
- No secrets in the agent environment.
- Use least-privilege identities for deployment and runtime.
- Prefer a dedicated deployment identity over broad personal-owner style access.
- If CI/CD is introduced later, prefer OIDC / workload identity federation over stored service account keys.

## Cost safety policy
Infrastructure should be designed to minimize both idle cost and accidental overspend.

Preferred controls:
- separate cloud project for this app
- conservative budgets and alert thresholds
- conservative service quotas where practical
- low-cost defaults
- scale-to-zero services when feasible

Agents should treat cost controls as part of the infrastructure, not as optional cleanup.

## Network and exposure policy
- Services should not be public by default unless explicitly required.
- Public ingress must be a deliberate, documented decision.
- Internal and admin-oriented services should remain restricted by default.
- Runtime identities should only have the minimum permissions needed.

## Firebase / GCP policy
When using Firebase or GCP:
- local emulation should be preferred before hosted deployment
- Firestore and Auth configuration should be represented in repo-managed config where practical
- hosted deployment should follow the same architecture already validated locally
- production-facing access should rely on authenticated identity, not knowledge of a UUID alone

## Script design policy
Deployment and infrastructure scripts should:
- be explicit
- print the target environment clearly
- fail fast on missing prerequisites
- separate planning from applying
- avoid hidden side effects
- be safe to inspect before execution

## Documentation requirements
For any infrastructure change, the agent should document:
- what resources are expected to be created or changed
- what manual prerequisites exist
- what commands a human should run
- how to validate success
- any rollback or cleanup considerations

## Review standard
Infrastructure work is not complete until:
- configuration is committed in repo
- local validation is documented
- deploy steps are documented
- cost and security assumptions are stated
- the human operator can understand what will happen before running apply