# Current Phase

## Active phase
Phase 8: Deployment scripts, setup, and Firestore provisioning

## Goal
Validate the human-in-the-loop deployment flow by provisioning the minimum hosted data layer and deployment tooling needed for the project.

This phase is intentionally narrow. The purpose is to prove that the repo can define the infrastructure and scripts needed for a human to provision Firestore in the existing GCP project, without giving the agent live cloud credentials or direct deployment authority.

## In scope
- add Terraform for the existing GCP project
- provision Firestore in the existing project
- add setup and deployment scripts for human-run local execution
- document the human-in-the-loop auth and deployment flow
- keep the deployment flow aligned with the repo’s deployment safety policy
- make the provisioning workflow reviewable, scriptable, and repeatable

## Out of scope
- Cloud Run deployment
- static frontend hosting
- Firebase Auth integration
- service account key creation or storage
- CI/CD automation
- production IAM hardening beyond what is needed for this validation step
- hosted app/backend integration
- grading integration
- client persistence or replay feature changes

## Desired qualities
- explicit and reviewable infrastructure changes
- human-controlled apply step
- no secrets or live credentials in the agent environment
- minimal blast radius
- simple local operator workflow
- easy evolution toward later hosted phases

## Design constraints
- target the existing GCP project only
- do not create a new project
- do not assume the agent has cloud credentials
- do not require service account keys in the repo
- separate planning/validation from applying changes
- prefer least-privilege and non-public defaults
- treat budgets, quotas, and deployment safety as first-class concerns where practical

## Recommended implementation direction
- use Terraform for hosted infrastructure definition
- keep local emulator/developer config separate from Terraform where appropriate
- use human-run local authentication via ADC for this phase
- keep scripts explicit and safe by default
- make `plan` easy and `apply` deliberate

## Suggested deliverables
- Terraform for the existing GCP project and Firestore provisioning
- setup scripts for local human-run execution
- plan/apply-oriented deployment scripts
- documentation for local auth and deployment steps
- documentation aligned with `docs/deployment-safety.md`

## Exit criteria
- the repo contains the Terraform and scripts needed for a human to provision Firestore in the existing GCP project
- the deployment flow is documented and does not require secrets in the agent environment
- a human can run the scripts locally and successfully provision Firestore

## Notes for the agent
- keep this phase narrowly scoped
- do not start Cloud Run deployment yet
- do not start frontend hosting yet
- do not add Firebase Auth setup yet unless it is strictly required for Firestore provisioning
- do not assume service account keys or console-driven setup
- prioritize clarity, safety, and repeatability over convenience shortcuts
- if a bootstrap/manual prerequisite is unavoidable, document it clearly and keep it minimal

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- add Cloud Run deployment through the same human-in-the-loop workflow
- keep infrastructure changes repo-managed and reviewable
- expand the hosted stack without redesigning the deployment approach