# Roadmap

This project is a web-based coding assessment platform for short timed programming tests.
Students write code in a Monaco editor, submit to a remote grader, and receive test results.
The system stores replayable edit history so instructors can review how solutions were developed.

## Product goals
- Let students complete short coding assessments in Python, Java, or JavaScript.
- Run grading remotely, not on student machines.
- Preserve a replayable development history for instructor review.
- Keep the system practical and useful without trying to fully eliminate cheating.
- Build in small, reviewable phases.

## Non-goals
- Perfect anti-cheat enforcement.
- Browser surveillance such as tab-switch tracking or full-device monitoring.
- General-purpose online IDE platform.
- Full LMS replacement.

## Guiding principles
- Build the smallest useful slice first.
- Prefer simple, durable interfaces between subsystems.
- Treat edit history as an integrity aid, not absolute proof.
- Keep grader/runtime concerns separate from the main app.
- Prefer infrastructure that is easy to reason about and debug.

Phases marked `(completed)` are done and retained here for project context.

## Planned phases

### Phase 1 (completed): Monaco editor page
Goal: get a static page with a working Monaco editor.

Deliverables:
- web app scaffold
- editor page
- language selection for Python, Java, JavaScript
- basic local source state

Exit criteria:
- the editor renders reliably
- source can be edited and switched between supported languages
- project structure is ready for future API integration

### Phase 2 (completed): In-memory edit history prototype
Goal: prove that Monaco edit events can be captured in memory and replayed accurately in the browser.

Deliverables:
- in-memory array of recorded editor change events
- timestamps and sequence numbers for each recorded event
- a simple recordable Monaco editor
- a simple replay Monaco editor on the same page
- ability to replay recorded changes into the replay editor
- a basic event log view for debugging and inspection

Exit criteria:
- edits made in the recordable editor are captured into an in-memory event list
- replay can reconstruct the editor contents accurately from recorded events alone
- undo/redo events are captured and replayed sensibly
- the event data shape used in the prototype is documented
- basic tests verify event capture and deterministic reconstruction

### Phase 3 (completed): Local client/server history prototype
Goal: prove that Monaco content-change events can remain the canonical edit-history stream while crossing a real client/server boundary.

Deliverables:
- local backend API
- client-generated UUID session flow
- periodic batched history upload from the recording page
- SQLite-backed local session storage
- replay page that loads and reconstructs a session by UUID
- documented event, API, replay, and storage approach

Exit criteria:
- a recording page can generate and display a UUID
- recorded edit history is sent to the backend in periodic batches
- the backend stores and returns the full ordered history for a session
- a replay page can load history by UUID in a new tab or browser session
- replay reconstructs the recorded editor contents accurately from backend-loaded history
- basic tests verify batching, API handling, and deterministic reconstruction from fetched history

### Phase 4: Local Firestore emulator sanity check
Goal: validate that Firestore and its local emulator are a reasonable fit for the project before integrating the full backend and client flow.

Deliverables:
- local Firestore emulator setup in the repo
- repeatable script or command to start the emulator
- visible local emulator UI
- trivial read/write validation against the emulator
- basic documentation for local emulator usage

Exit criteria:
- the Firestore emulator starts reliably in local development
- the local emulator UI is reachable
- a trivial write can be stored and read back successfully
- the local setup is documented and scriptable

### Phase 5: Backend container to Firestore validation
Goal: prove that the backend, running in its containerized form, can connect to the local Firestore emulator and perform simple reads and writes.

Deliverables:
- backend container setup for local execution
- backend configuration for connecting to the Firestore emulator
- trivial backend read/write path to Firestore
- basic container/backend connection documentation

Exit criteria:
- the backend runs successfully in its container locally
- the backend can connect to the Firestore emulator
- a trivial backend-triggered write can be read back successfully
- the container-to-emulator setup is documented and repeatable

### Phase 6: Backend API seam validation
Goal: validate the backend API shape independently of the frontend before wiring in the full browser flow.

Deliverables:
- at least one simple HTTP endpoint on the backend
- endpoint-level Firestore read/write behavior
- a small test harness or script for exercising the endpoint
- basic API documentation for the local validation endpoint(s)

Exit criteria:
- the backend API can be called locally without the real frontend
- an API request can trigger Firestore read/write behavior successfully
- the API seam is documented and testable independently of the UI

### Phase 7: Local client/backend/Firestore vertical prototype
Goal: prove the full local round trip from browser client to backend container to Firestore and back again.

Deliverables:
- recording page that sends data through the backend API
- replay or retrieval path that loads data back through the backend
- visible end-to-end validation of client ↔ backend ↔ Firestore
- tests for the local vertical slice and its core logic

Exit criteria:
- the client can successfully call the backend locally
- the backend stores and retrieves data through Firestore
- the full local round trip works end-to-end
- the vertical prototype is scriptable and repeatable in local development

### Phase 8: Hosted deployment prototype
Goal: deploy the validated vertical slice in a hosted environment to confirm that the chosen cloud stack is a good fit.

Deliverables:
- first hosted deployment of the vertical prototype
- hosted app/API environment
- hosted Firestore-backed flow
- basic deployment documentation

Exit criteria:
- the vertical slice runs successfully in the hosted environment
- the hosted stack validates the local architectural assumptions
- deployment steps are documented and repeatable

### Phase 9: Client persistence and sync hardening
Goal: make edit history more durable on the client and prepare the client/server flow for more reliable real-world use.

Deliverables:
- local client persistence for recorded history
- recovery after refresh or browser crash
- sync state tracking for uploaded versus pending history
- checkpoint or snapshot strategy as needed
- improved client/server batching behavior

Exit criteria:
- locally recorded work survives refresh and ordinary browser interruption
- the client can resume and continue syncing history for an active session
- replay remains accurate when combining persisted and synced history
- the local persistence and sync model are documented

### Phase 10: Remote grader
Goal: run hidden tests in an isolated execution environment and return results.

Deliverables:
- queue or job submission model
- isolated grader runtime
- per-language execution path
- structured test result format
- resource limits and timeout behavior

Exit criteria:
- sample Python and JavaScript problems can be graded end-to-end
- Java support is either included or explicitly deferred
- grader artifacts and logs are saved for debugging

### Phase 10.5: Load and cost planning
Goal: understand expected scale, queueing behavior, and likely cost.

Deliverables:
- baseline traffic assumptions
- submission concurrency model
- grading duration estimates
- storage growth estimates
- stress test harness and sizing report

Exit criteria:
- can estimate peak grading concurrency
- can estimate storage growth per term
- can identify likely bottlenecks and cost drivers

### Phase 11: Admin attempt listing
Goal: allow instructors/admins to view saved attempts.

Deliverables:
- admin auth placeholder or instructor-only access path
- attempt list page
- filters by class, student, problem, date
- links to submission details

Exit criteria:
- saved attempts can be found quickly
- metadata indexing is sufficient for normal class use

### Phase 12: Instructor replay and inspection UI
Goal: provide draggable playback of student edit history for instructor review.

Deliverables:
- timeline slider
- play/pause/scrub controls
- checkpoint-aware replay
- display of submission moments and major paste events

Exit criteria:
- replay is responsive on realistic histories
- reconstruction fidelity is trustworthy
- instructors can inspect suspicious transitions

### Phase 13: User accounts and roster system
Goal: support real student login and class management.

Deliverables:
- user accounts
- instructor/admin roles
- class and roster management
- exam/session assignment

Exit criteria:
- students can log in and access assigned work
- instructors can manage rosters and exam availability

### Phase 14: Results and instructor dashboards
Goal: present grades and replayable attempts together.

Deliverables:
- student result summaries
- per-problem results
- replay link per attempt
- export or summary views for instructors

Exit criteria:
- instructors can see both outcomes and development history in one workflow

### Phase 15: Git-based test management
Goal: make problem and test authoring manageable and reproducible.

Deliverables:
- test definitions in git
- version pinning by commit SHA or release tag
- workflow for activating new tests
- reproducible mapping from submission to grader/test version

Exit criteria:
- tests are traceable and reproducible
- grader runs can be tied to immutable test versions