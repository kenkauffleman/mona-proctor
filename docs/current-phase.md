# Current Phase

## Active phase
Phase 7: Local client/backend/Firestore vertical prototype

## Goal
Prove the full local round trip from browser client to backend container to Firestore and back again.

This phase should validate that the browser can send recorded history through the backend API, the backend can persist and retrieve it through Firestore, and the replay path can reconstruct the session from backend-loaded data alone.

## In scope
- connect the browser client to the backend API
- send recorded history batches from the recording page through the backend
- persist and retrieve session history through Firestore
- load session history back through the backend for replay
- validate the full local client ↔ backend ↔ Firestore round trip
- keep the local setup scriptable and repeatable
- introduce a small persistence abstraction layer so Firestore usage is isolated behind a backend interface
- use that abstraction layer to improve testing seams and future storage flexibility

## Out of scope
- hosted deployment
- Firebase Auth integration
- Firestore security rules design
- final production API design
- final production Firestore schema design
- advanced replay controls
- client-side persistence and crash recovery
- grading integration
- admin or instructor feature work

## Desired qualities
- simple and understandable API shape
- deterministic replay from backend-loaded history
- clear separation between API logic and persistence logic
- minimal Firestore-specific code outside the persistence layer
- easy local debugging
- repeatable local validation workflow

## Design constraints
- keep the API intentionally small:
  - one append-style write path for history batches
  - one read path for loading a full session for replay
- keep session metadata separate from uploaded history batches
- preserve the canonical Monaco content-change payload as much as practical
- include explicit sequence information so retries and ordering are understandable
- optimize for correctness, simplicity, inspectability, and easy evolution later

## Persistence abstraction guidance
- isolate Firestore access behind a small backend abstraction layer
- define the abstraction around current use cases, not around a speculative generic storage framework
- keep the abstraction narrow and explicit
- prefer a small interface such as:
  - create or update session metadata
  - append history batch
  - load session history for replay
- provide a Firestore-backed implementation for this phase
- structure code so tests can use a fake or in-memory implementation without requiring Firestore

## Suggested deliverables
- recording page that sends history through the backend API
- replay or retrieval path that loads data back through the backend
- persistence interface or repository layer for session/history storage
- Firestore-backed implementation of that persistence layer
- visible end-to-end validation of client ↔ backend ↔ Firestore
- tests for the local vertical slice and its core logic
- updated scripts and documentation for repeatable local validation

## Exit criteria
- the client can successfully call the backend locally
- the backend stores and retrieves data through Firestore
- the full local round trip works end-to-end
- replay reconstructs from backend-loaded history alone
- Firestore usage is isolated behind a small persistence abstraction
- the vertical prototype is scriptable and repeatable in local development

## Notes for the agent
- keep this phase narrowly scoped
- do not overdesign the final production API
- do not add auth, submission/grading, or unrelated infrastructure concerns
- do not turn the persistence abstraction into a large framework
- prioritize replay correctness, retry tolerance, and inspectability
- structure the code so the persistence boundary is easy to test independently from the page-level UI

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- validate the hosted deployment of the same vertical slice
- swap or extend the persistence implementation later if needed
- continue toward client persistence and sync hardening