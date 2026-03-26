# Current Phase

## Active phase
Phase 9: Cloud Run backend deployment

## Goal
Deploy the backend/API portion of the validated vertical slice to Cloud Run and confirm that the hosted backend can use the chosen cloud data path without being publicly writable during the prototype stage.

This phase is intentionally narrow. The purpose is to validate the hosted backend deployment path, Firestore connectivity, and private-service invocation workflow before exposing the backend to hosted browser clients.

## In scope
- add Terraform and scripts for Cloud Run backend deployment
- deploy the existing backend/API to Cloud Run
- configure the hosted backend to communicate with hosted Firestore
- keep the Cloud Run service non-public by default
- add a human-usable validation path for invoking the private service
- document the deployment and validation flow

## Out of scope
- public backend exposure
- hosted frontend integration
- Firebase Auth browser flow
- App Check
- Cloud Armor
- final production IAM hardening beyond what is needed for this phase
- grader deployment
- client persistence changes
- replay feature changes

## Desired qualities
- private-by-default backend deployment
- minimal blast radius
- simple human validation workflow
- repeatable deployment through repo-managed scripts
- clear separation between hosted backend validation and later hosted browser integration

## Design constraints
- the Cloud Run service must not be publicly invokable by default
- validation should work through a human-operated path such as:
  - Cloud Run proxy
  - or curl with an identity token
- keep the deployment aligned with the repo’s deployment safety policy
- do not assume agent access to live cloud credentials
- keep the implementation focused on backend hosting and Firestore connectivity only

## Suggested deliverables
- Terraform for Cloud Run backend deployment
- scripts for human-run local plan/apply and validation
- runtime configuration for hosted backend ↔ Firestore connectivity
- IAM or service configuration needed for private-service validation
- deployment and validation documentation

## Exit criteria
- the backend/API deploys successfully to Cloud Run
- the hosted backend can communicate with the hosted Firestore setup
- the backend is not publicly invokable by default during this phase
- a human can validate the private service using the documented workflow
- the deployment is documented and repeatable through the repo-managed workflow

## Notes for the agent
- keep this phase narrowly scoped
- do not make the service public just to simplify testing
- do not start hosted frontend integration yet
- do not add Firebase Auth browser flow yet
- prioritize private-by-default deployment and a clean human validation path
- keep the scripts and docs explicit about what the human operator must do

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- keep the hosted backend private while validating it
- add hosted frontend integration later
- introduce authenticated browser-to-backend access in the next phase