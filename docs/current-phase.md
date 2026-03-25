# Current Phase

## Active phase
Phase 5: Backend container to Firestore validation

## Goal
Prove that the backend, running in its containerized form, can connect to the local Firestore emulator and perform simple reads and writes.

This phase is intentionally narrow. The purpose is to validate the containerized backend runtime and its connection to the local Firestore emulator before building more API surface or adding richer application behavior.

## In scope
- set up the backend for containerized local execution
- add backend configuration for connecting to the local Firestore emulator
- choose and use a lightweight backend stack that fits the project direction
- implement a trivial backend-triggered Firestore write and read path
- document how to run the backend container locally against the emulator
- update the relevant npm scripts so the Phase 5 validation path includes the backend container
- update the agent script guide so it reflects the new container-based validation workflow
- keep the setup aligned with the future Cloud Run deployment model

## Out of scope
- full backend API design
- client integration with the backend
- Firebase Auth integration
- Firestore security rules design
- hosted deployment
- production IAM or secrets setup
- final Firestore schema design
- grading integration
- admin or replay feature work

## Desired qualities
- simple and repeatable local setup
- minimal moving parts
- easy local debugging
- lightweight backend structure
- easy evolution toward Cloud Run
- validation focused on proving container ↔ Firestore emulator compatibility

## Recommended implementation direction
- backend language: TypeScript
- runtime: Node.js 22
- framework: Express
- Firestore access: Firebase Admin SDK
- container base image: `node:22-bookworm-slim`

These are recommendations for this phase because they are lightweight, familiar, and align well with the likely hosted deployment path.

## Script expectations
- preserve the existing Phase 3 scripts unless a small adjustment is clearly necessary
- add or update scripts so there is a repeatable way to:
  - start the Firestore emulator
  - run the backend in its container
  - validate backend container ↔ Firestore emulator connectivity
- keep script names clear and explicit
- update the script guide so it clearly distinguishes:
  - direct emulator sanity checks
  - backend container ↔ emulator validation
  - older local SQLite/API scripts from Phase 3

## Suggested deliverables
- backend container configuration
- repeatable command or script for running the backend container locally
- backend configuration for Firestore emulator connectivity
- trivial read/write validation path in the backend
- updated npm scripts for container-based validation
- updated agent script guide
- short local setup and validation documentation

## Exit criteria
- the backend runs successfully in its container locally
- the backend can connect to the Firestore emulator
- a trivial backend-triggered write can be read back successfully
- the container-to-emulator setup is documented and repeatable
- the relevant validation scripts include the backend container in the loop
- the script guide accurately describes the new workflow

## Notes for the agent
- keep this phase narrowly scoped
- do not overbuild the backend architecture yet
- do not start designing the final API surface yet
- do not add auth or unrelated infrastructure concerns
- prioritize simplicity, repeatability, and confidence in the local runtime setup
- structure the backend code so it can grow later without requiring a rewrite
- treat script updates and script-guide updates as part of the core deliverable for this wave

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- validate backend API behavior independently of the frontend
- add simple HTTP endpoints that exercise Firestore through the containerized backend
- continue toward a full local client ↔ backend ↔ Firestore vertical slice