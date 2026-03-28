# Current Phase

## Active phase
Phase 13: Python execution result integration

## Goal
Connect the Python execution prototype into the product flow and display execution results in the UI.

This phase is intentionally narrow. The purpose is to take the already-built Python execution backend flow and make it usable from the authenticated application UI, while keeping the execution model, result contract, and backend abstraction intact.

## In scope
- add backend endpoints for execution submission and result retrieval suitable for the app flow
- integrate Python execution submission into the authenticated UI
- display execution results in the UI, including:
  - stdout
  - stderr
  - exit status
  - duration
  - truncation state
- connect the UI to the existing execution prototype and Firestore-backed execution records
- document the integrated Python execution flow
- add or update scripts and docs needed for repeatable local validation
- update `AGENTS.md` with guidance that human-facing deployment/validation commands should target `prod`

## Out of scope
- hidden tests
- grading semantics
- Java execution
- execution history browsing UI
- multiple-run history UI
- security hardening beyond what already exists
- bubblewrap or deeper sandboxing changes
- App Check
- Cloud Armor
- client persistence changes
- admin/instructor features

## Desired qualities
- simple authenticated execution flow from the UI
- reuse of the existing execution abstraction and result contract
- clear UI states for running, success, failure, timeout, and truncation
- latest-result-only UI for this phase
- strong local validation before any success claim
- repeatable local and emulated validation workflow

## Design constraints
- reuse the existing Python execution prototype rather than redesigning it
- show only the latest execution result in the UI for now
- do not add execution history browsing in this phase
- keep result retrieval tied to the authenticated user and existing authorization model
- keep local testing and emulator-based validation as first-class success criteria
- do not treat hosted/manual validation alone as sufficient before local validation passes

## Suggested deliverables
- backend endpoints for app-facing execution submission/result retrieval
- authenticated UI integration for Python execution
- UI rendering for stdout/stderr, exit status, duration, and truncation
- loading/pending/error states for execution
- documentation for the integrated Python execution flow
- updated scripts and script guide entries as needed
- updated `AGENTS.md` guidance for human-facing commands

## Exit criteria
- authenticated users can submit Python code from the UI
- execution results are displayed correctly in the UI
- result retrieval works against the stored execution records
- only the latest execution result is shown in the UI for this phase
- the integrated flow is validated thoroughly locally, including emulator-backed validation where relevant
- the UI-integrated execution flow is documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not redesign the execution backend or result contract
- do not add grading yet
- do not add execution history browsing UI yet
- prioritize thorough local validation before claiming success
- include emulated/local validation where relevant, not just hosted/manual checks
- update `AGENTS.md` so that human-facing deployment or validation commands default to targeting `prod` where applicable and are explicit about the target environment
- keep the human instructions clear, concise, and safe

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- extend Python execution into hidden-test grading
- reuse the same UI pathway for later execution/grading features
- keep security hardening as a separate focused follow-up wave