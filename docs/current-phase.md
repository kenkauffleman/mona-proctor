# Current Phase

## Active phase
Phase 4: Local Firestore emulator sanity check

## Goal
Validate that Firestore and its local emulator are a reasonable fit for the project before integrating the full backend container and client flow.

This phase is about local datastore validation only. It is not yet about wiring the real backend container to Firestore, changing the browser flow, production hosting, auth, or grading.

## In scope
- add local Firestore emulator configuration to the repo
- provide a repeatable command to start the emulator
- expose the local emulator UI for manual inspection
- add a trivial write/read validation path against the emulator
- document how to start and verify the emulator locally

## Out of scope
- backend container integration with Firestore
- frontend-to-Firestore integration
- replacing the Phase 3 SQLite prototype
- cloud deployment or production hosting
- auth, accounts, or roster features
- submission/grading integration
- admin dashboards
- hardened security or production-grade access control

## Desired qualities
- simple and understandable local development setup
- repeatable startup and validation commands
- configuration that works well in a remote container environment
- minimal implementation that can be reused in Phase 5
- verification focused on startup, connectivity, and trivial datastore behavior

## Suggested deliverables
- local Firestore emulator setup
- scriptable emulator startup command
- visible Emulator UI
- trivial read/write validation script or command
- basic local usage documentation

## Exit criteria
- the Firestore emulator starts reliably in local development
- the Emulator UI is reachable
- a trivial write can be stored and read back successfully
- the local setup is documented and scriptable

## Notes for the agent
- keep this phase narrowly focused on emulator setup and sanity checks
- prefer the smallest possible amount of Firebase-specific code
- make the emulator reachable in Codespaces-style environments
- do not wire the main backend flow to Firestore yet
- prioritize repeatability and clarity over abstraction

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to add:
- backend container configuration for Firestore emulator access
- a backend-triggered Firestore read/write path
- clearer environment-variable conventions for local datastore work
