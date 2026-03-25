# Current Phase

## Active phase
Phase 6: Backend API seam validation

## Goal
Validate the backend API shape independently of the frontend before wiring in the full browser flow.

This phase is intentionally narrow. The purpose is to prove that the backend can expose a simple HTTP API that talks to Firestore correctly, and that this API can be exercised and validated without involving the real frontend.

## In scope
- add at least one simple HTTP endpoint on the backend
- make the endpoint exercise Firestore read/write behavior
- ensure the backend API can be called locally without the frontend
- add a small test harness or script for exercising the endpoint
- document the local validation endpoint(s) and how to run them
- keep the setup aligned with the future client ↔ backend ↔ Firestore architecture

## Out of scope
- full frontend integration
- full production API design
- Firebase Auth integration
- Firestore security rules design
- hosted deployment
- final Firestore schema design
- replay feature changes
- grading integration
- admin or instructor feature work

## Desired qualities
- simple and understandable API surface
- minimal moving parts
- easy local debugging
- easy-to-run validation without the browser
- backend behavior that is easy to evolve later toward the real client flow

## Recommended implementation direction
- continue using the existing lightweight backend stack from Phase 5
- keep the API small and explicit
- favor one narrow validation endpoint over prematurely designing the full future API
- keep the Firestore interaction simple and easy to inspect

## Script expectations
- preserve existing scripts unless a small adjustment is clearly necessary
- add or update scripts so there is a repeatable way to:
  - start the Firestore emulator
  - run the backend in its container
  - exercise the backend validation endpoint without the frontend
- keep script names clear and explicit
- update the agent script guide so it accurately reflects the new API-validation workflow

## Suggested deliverables
- at least one simple backend HTTP endpoint
- endpoint-level Firestore read/write behavior
- a small test harness or script for exercising the endpoint
- updated scripts for repeatable local API validation
- updated agent script guide
- basic API documentation for the local validation endpoint(s)

## Exit criteria
- the backend API can be called locally without the real frontend
- an API request can trigger Firestore read/write behavior successfully
- the API seam is documented and testable independently of the UI

## Notes for the agent
- keep this phase narrowly scoped
- do not start full frontend integration yet
- do not overdesign the long-term API surface yet
- do not add auth or unrelated infrastructure concerns
- prioritize simplicity, repeatability, and confidence in the local API seam
- structure the endpoint and supporting code so it can be reused or evolved in later phases

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- connect the browser client to the backend validation API
- validate the full local client ↔ backend ↔ Firestore round trip
- continue toward the local vertical prototype in the next phase