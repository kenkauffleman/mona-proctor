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

### Phase 4 (completed): Local Firestore emulator sanity check
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

### Phase 5 (completed): Backend container to Firestore validation
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

### Phase 6 (completed): Backend API seam validation
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

### Phase 7 (completed): Local client/backend/Firestore vertical prototype
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

### Phase 8 (completed): Deployment scripts, setup, and Firestore provisioning
Goal: validate the human-in-the-loop deployment flow by provisioning the minimum hosted data layer and deployment tooling needed for the project.

Deliverables:
- Terraform for the existing GCP project
- setup and deployment scripts for human-run local execution
- Firestore provisioning in the cloud project
- documented human-in-the-loop auth and deployment flow
- deployment safety documentation aligned with the repo policy

Exit criteria:
- the repo contains the Terraform and scripts needed for a human to provision Firestore in the existing GCP project
- the deployment flow is documented and does not require secrets in the agent environment
- a human can run the scripts locally and successfully provision Firestore

### Phase 9 (completed): Cloud Run backend deployment
Goal: deploy the backend/API portion of the validated vertical slice to Cloud Run and confirm that the hosted backend can use the chosen cloud data path without being publicly writable during the prototype stage.

Deliverables:
- Terraform and scripts for Cloud Run backend deployment
- hosted backend/API environment
- configuration for backend connectivity to hosted Firestore
- deployment and validation documentation for the backend service
- non-public backend deployment by default

Exit criteria:
- the backend/API deploys successfully to Cloud Run
- the hosted backend can communicate with the hosted Firestore setup
- the backend is not publicly invokable by default during this phase
- the deployment is documented and repeatable through the repo-managed workflow

### Phase 10: Local Firebase Auth validation
Goal: validate the application-level authentication flow locally before introducing hosted browser-to-backend authenticated access.

Deliverables:
- local Firebase Auth emulator setup
- local test users and sign-in flow
- frontend acquisition of Firebase ID tokens in local development
- backend verification of Firebase ID tokens in local development
- documentation for the local authenticated flow

Exit criteria:
- a local user can sign in through the Auth emulator
- the frontend can acquire and send a Firebase ID token to the backend
- the backend can verify the token locally
- authenticated local browser ↔ backend ↔ Firestore behavior is validated
- the local auth workflow is documented and repeatable

### Phase 11: Hosted frontend and authenticated cloud flow
Goal: deploy the frontend in a hosted form and validate the full hosted browser ↔ backend ↔ Firestore path using authenticated access rather than a publicly writable backend.

Deliverables:
- hosting configuration for the static frontend
- deployment scripts or Terraform-managed setup as appropriate
- Firebase Auth setup needed for hosted browser-to-backend access
- documentation for the hosted frontend flow
- end-to-end hosted validation path

Exit criteria:
- the frontend is hosted successfully
- authenticated browser clients can communicate with the hosted backend
- the full hosted vertical slice works end-to-end
- the hosting and authenticated access flow are documented and repeatable

### Phase 12: Client persistence and sync hardening
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

### Phase 13: Remote grader
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

### Phase 13.5: Load and cost planning
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

### Phase 14: Admin attempt listing
Goal: allow instructors/admins to view saved attempts.

Deliverables:
- admin auth placeholder or instructor-only access path
- attempt list page
- filters by class, student, problem, date
- links to submission details

Exit criteria:
- saved attempts can be found quickly
- metadata indexing is sufficient for normal class use

### Phase 15: Instructor replay and inspection UI
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

### Phase 16: User accounts and roster system
Goal: support real student login and class management.

Deliverables:
- user accounts
- instructor/admin roles
- class and roster management
- exam/session assignment

Exit criteria:
- students can log in and access assigned work
- instructors can manage rosters and exam availability

### Phase 17: Results and instructor dashboards
Goal: present grades and replayable attempts together.

Deliverables:
- student result summaries
- per-problem results
- replay link per attempt
- export or summary views for instructors

Exit criteria:
- instructors can see both outcomes and development history in one workflow

### Phase 18: Git-based test management
Goal: make problem and test authoring manageable and reproducible.

Deliverables:
- test definitions in git
- version pinning by commit SHA or release tag
- workflow for activating new tests
- reproducible mapping from submission to grader/test version

Exit criteria:
- tests are traceable and reproducible
- grader runs can be tied to immutable test versions