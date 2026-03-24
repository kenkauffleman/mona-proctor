# Current Phase

## Active phase
Phase 3: Local client/server history API prototype

## Goal
Prove that recorded Monaco edit history can be sent from the client to a backend API in periodic batches, stored on the backend, and later loaded in a separate browser session for replay.

This phase is about validating the API boundary between the client and backend. It is not yet about production hosting, long-term persistence strategy, auth, or grading.

## In scope
- run the backend locally during development
- generate a client-side UUID for each recording session
- create a recording page that:
  - records edit history from a Monaco editor
  - displays the session UUID
  - periodically sends batches of recorded events to the backend
- create a replay page that:
  - accepts a session UUID as input
  - fetches full history for that session from the backend
  - replays the fetched history into a Monaco replay editor
- store session history in SQLite on the backend
- define and document the request/response shape for the history API
- verify that backend-loaded history can reconstruct the recorded editor contents accurately

## Out of scope
- cloud deployment or production hosting
- client-side persistence such as IndexedDB
- auth, accounts, or roster features
- submission/grading integration
- admin dashboards
- advanced replay controls
- paste-specific annotations
- cursor, selection, focus, or composition tracking
- hardened security or production-grade access control

## Desired qualities
- simple and understandable client/server API
- append-friendly history upload design
- deterministic replay from backend-fetched history
- implementation that is easy to evolve later toward persistence and grading
- tests focused on batching, API behavior, and reconstruction logic rather than temporary page layout

## Suggested deliverables
- local backend service with history endpoints
- SQLite-backed storage for session history
- recording page with:
  - recordable Monaco editor
  - visible session UUID
  - visible sync/debug status
- replay page with:
  - UUID input
  - load action
  - Monaco replay editor
- basic API documentation
- tests for:
  - client batching logic
  - backend ingestion/storage behavior
  - deterministic reconstruction from fetched history

## Exit criteria
- a recording session generates and displays a UUID
- recorded events are sent to the backend in periodic batches
- the backend stores and returns the complete ordered history for a session
- a replay page can load history by UUID in a separate tab or session
- replay reconstructs the recorded editor contents accurately from backend-loaded history alone
- the API and event payload shape are documented
- basic automated tests verify batching, API handling, and deterministic reconstruction

## Notes for the agent
- keep this phase focused on validating the client/server API seam
- prefer a simple local-first development setup
- use Monaco content-change events as the canonical history source
- keep the history/event model simple and append-oriented
- prioritize correctness and clarity over production hardening
- structure logic so recording, batching, API interaction, and replay can be tested independently of the demo pages

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to add:
- client-side persistence and recovery
- more reliable sync state tracking
- richer replay metadata
- eventual integration with submission and grading flows