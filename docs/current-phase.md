# Current Phase

## Active phase
Phase 2: In-memory edit history prototype

## Goal
Prove that Monaco edit events can be captured in memory and replayed accurately in the browser.

This phase is a focused prototype. The purpose is to validate the core idea of recording editor changes and reconstructing them later, before adding persistence, server upload, or richer metadata.

## In scope
- capture Monaco content-change events from a recordable editor
- store recorded events in an in-memory array
- assign sequence numbers and timestamps to recorded events
- display or inspect the recorded event log for debugging
- add a replay editor on the same page
- replay recorded changes into the replay editor
- verify that replay reconstructs the final editor contents accurately
- document the prototype event data shape

## Out of scope
- IndexedDB or any other local persistence
- server upload
- backend submission APIs
- auth, rosters, or admin features
- paste-specific annotations
- selection, cursor, focus, or composition tracking
- draggable replay timeline
- grading integration

## Desired qualities
- simple and readable implementation
- clear separation between recording logic and replay logic
- event shape that can evolve later without major redesign
- deterministic reconstruction from recorded events alone
- easy-to-test logic for capture and replay

## Suggested deliverables
- one page with:
  - a recordable Monaco editor
  - a replay Monaco editor
  - a visible event log or debug panel
- in-memory event recording
- replay controls such as reset and replay
- basic documentation for how the prototype works

## Exit criteria
- edits made in the recordable editor are captured into an in-memory event list
- each recorded event has a sequence number and timestamp
- replay reconstructs editor contents accurately from recorded events alone
- undo/redo events are captured and replayed sensibly
- the prototype event shape is documented
- basic automated tests verify event capture and deterministic reconstruction

## Notes for the agent
- keep this phase narrow and prototype-oriented
- prefer Monaco content-change events as the canonical signal
- do not add persistence or server communication yet
- do not add extra event types unless they are required to make capture/replay work
- prioritize correctness and clarity over polish

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to add:
- local persistence for recorded history
- background or submission-time upload
- richer event annotations such as paste detection
- more advanced replay controls