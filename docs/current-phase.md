# Current Phase

## Active phase
Phase 11: Hosted frontend and authenticated cloud flow

## Goal
Deploy the frontend in a hosted form and validate the full hosted browser ↔ backend ↔ Firestore path using authenticated access rather than a publicly writable backend.

This phase should prove that the same application-level auth model validated locally also works in the hosted environment: the browser signs in with Firebase Auth, acquires a Firebase ID token, sends it to the backend, and the backend verifies the token and enforces authorization against the hosted data model.

## In scope
- host the static frontend in the cloud
- keep the hosted frontend flow Terraform-managed
- configure the hosted frontend for Firebase Auth
- connect the hosted frontend to the hosted backend/API
- send Firebase ID tokens from the browser to the backend
- verify authenticated browser ↔ backend ↔ Firestore behavior in the hosted environment
- validate that backend authorization still works correctly with hosted clients
- configure CORS explicitly for the hosted frontend origin(s)
- document the hosted frontend and authenticated access flow

## Out of scope
- App Check
- Cloud Armor
- custom domain setup
- advanced auth UX polish
- multiple auth providers beyond what is needed for this phase
- role-system expansion beyond the existing minimal model
- grader deployment or integration
- client persistence changes
- admin/instructor feature expansion

## Desired qualities
- simple and repeatable hosted deployment flow
- Terraform-managed hosting and configuration
- explicit and minimal CORS configuration
- authenticated browser access rather than anonymous writable access
- reuse of the already validated local auth/authz model
- easy human validation of the hosted end-to-end flow

## Design constraints
- keep the frontend statically hosted
- use Firebase Hosting for the hosted frontend
- keep the backend browser-reachable only for authenticated application requests
- require Firebase ID tokens for meaningful backend access
- rely on backend token verification and authorization checks
- keep the implementation Terraform-only for hosted infrastructure and configuration where practical
- do not add custom domains or unrelated production hardening in this phase

## Recommended implementation direction
- use Firebase Hosting for the static frontend
- keep the existing Cloud Run backend and hosted Firestore path
- use the existing user account model and ownership-based authorization logic
- reuse the auth provider already validated locally
- configure frontend runtime/environment values explicitly for the hosted deployment
- scope CORS to the hosted frontend origin(s), not broad wildcards unless absolutely necessary

## Suggested deliverables
- Terraform-managed hosting configuration for the static frontend
- deployment scripts and documentation for hosted frontend deployment
- hosted frontend configured for Firebase Auth
- hosted frontend configured to call the hosted backend
- explicit backend CORS configuration for the hosted frontend origin(s)
- end-to-end hosted validation path
- updated docs and scripts for repeatable human-run deployment and validation

## Exit criteria
- the frontend is hosted successfully
- authenticated browser clients can communicate with the hosted backend
- the backend verifies Firebase ID tokens from hosted clients
- the backend enforces authorization correctly for hosted clients
- the full hosted vertical slice works end-to-end
- the hosting and authenticated access flow are documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not redesign the auth model; carry forward the one already validated locally
- do not add App Check, Cloud Armor, or custom domains in this phase
- do not weaken backend authorization just to simplify frontend integration
- treat CORS as an explicit part of the hosted design
- keep the hosted infrastructure and configuration Terraform-managed

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- harden the hosted browser/client flow further later if needed
- build on a working authenticated hosted vertical slice
- continue toward client persistence and sync hardening