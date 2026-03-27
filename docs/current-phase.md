# Current Phase

## Active phase
Phase 12: Python execution prototype

## Goal
Run user-submitted Python code in a restricted remote execution environment and return stdout/stderr results without yet integrating the flow into the UI.

This phase is intentionally narrow. The purpose is to validate the remote execution path, the execution abstraction layer, the result contract, and the Firestore-backed execution record flow before adding UI integration or hidden-test grading.

## In scope
- add a backend abstraction layer for submitting and retrieving execution jobs
- implement a Cloud Run Job-based execution path for Python
- keep the execution backend swappable so Cloud Run Jobs are not hardcoded throughout the app
- define and implement a tiny async execution contract
- store execution job metadata and results in Firestore
- support script-driven submission and result retrieval
- configure `.env`-driven limits for:
  - source size
  - timeout
  - stdout/stderr truncation
  - global concurrency-related settings
- enforce one active execution per authenticated user
- validate the execution container locally before relying on Cloud Run Job deployment for first execution testing
- document the execution prototype flow

## Out of scope
- UI integration for execution
- hidden tests
- grading semantics
- Java execution
- App Check
- Cloud Armor
- spam protection beyond the stated active-job and global-cap rules
- polished logging/observability systems
- client persistence changes

## Desired qualities
- strong separation between app logic and execution backend
- simple and inspectable execution result contract
- repeatable script-driven validation
- Firestore-backed job/result records that are easy to inspect
- restrictive defaults with configurable limits
- clear path to swap the execution backend later if Cloud Run Jobs prove too slow or awkward
- local execution-container validation before hosted job integration

## Design constraints
- use a small Python runtime image for execution
- use Cloud Run Jobs for the first execution backend
- place an abstraction layer between job submission and the Cloud Run Job implementation
- use a tiny async model rather than direct UI-driven synchronous execution
- use no network during execution
- use empty stdin and argv
- use an empty working directory as the default execution environment
- treat “stdlib only”, “no file creation”, and “no process spawning” as desirable if they are easy to enforce with simple runtime/container flags, but do not overcomplicate this phase if they are not trivial
- use Firestore to store execution metadata and results
- enforce one active execution per authenticated user
- keep global caps configurable via `.env`, while using platform/service configuration for coarse global ceilings where practical

## Result contract guidance
The execution result shape should include at least:
- `status`
- `stdout`
- `stderr`
- `exitCode`
- `durationMs`
- `truncated`

Output truncation should:
- be controlled by configurable limits
- set `truncated = true`
- not require a special truncation marker in the returned output

## Suggested deliverables
- execution service abstraction
- Cloud Run Job-backed Python execution implementation
- Firestore-backed execution job/result records
- script(s) for submission and polling/result retrieval
- local validation path for the execution container
- `.env`-driven execution limit configuration
- documentation for running and validating the Python execution prototype

## Exit criteria
- an authenticated user can submit Python code through a script-driven flow
- execution is performed remotely through the configured execution backend
- the execution container is validated locally before relying on hosted execution
- stdout/stderr, exit status, duration, and truncation state are returned and stored
- no UI integration is required in this phase
- one active execution per authenticated user is enforced
- the execution prototype is documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not add UI integration yet
- do not add hidden tests or grading yet
- do not bake Cloud Run Job details directly into unrelated app code
- prioritize execution/backend abstraction, clear limits, and result correctness
- keep the Firestore model for execution records separate from the session/history model
- prefer simple script-driven validation over broad product integration
- do not treat Cloud Run Job deployment as the first time the execution container is exercised
- validate the execution container locally first so failures in the runtime image, entrypoint, or result-capture logic are caught before hosted execution is involved

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- connect execution submission and result retrieval into the UI
- reuse the same result contract for later grading
- swap the execution backend later if needed without invasive changes