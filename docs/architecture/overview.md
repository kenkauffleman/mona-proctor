# Architecture Overview

## System summary
The platform is a web-based coding assessment system with three primary capabilities:
1. student code editing in a browser-based Monaco editor
2. remote grading in an isolated execution environment
3. instructor review of replayable edit history and submission results

The system should be built as a set of cleanly separated components rather than one large application blob.

## High-level architecture

### Client application
Responsibilities:
- render Monaco editor
- manage current source state
- capture edit history
- replay edit history when needed
- send recorded history batches to the backend
- later: handle login, timers, submission flow, and student exam flow
- later: show grading results

Likely stack:
- TypeScript
- React or similar frontend framework
- Monaco editor
- Firebase client SDKs for Auth and Firestore-related integration where appropriate

### App/API backend
Responsibilities:
- receive history batches from the client
- validate ordering and session identifiers
- persist and retrieve session history
- later: manage submissions and grading orchestration
- later: serve admin and instructor data
- later: write larger artifacts and logs to object storage if needed

Deployment model:
- deployed on Cloud Run in the hosted environment
- stateless service instances
- scale-to-zero when idle
- designed for bursty classroom traffic

Likely stack:
- TypeScript backend
- Cloud Run
- Firestore
- later: object storage and grading job orchestration as needed

### Grader service
Responsibilities:
- fetch submission payload
- assemble grading inputs
- run hidden tests in isolation
- enforce time/memory/output limits
- produce structured results
- store logs and artifacts

Important:
- keep grader/runtime images separate from the main app dev environment
- version runtimes and tests explicitly
- assume student code is hostile or buggy
- treat grading as a separate compute surface from the main app/API

Likely deployment direction:
- Cloud Run Jobs or another isolated container-based execution path

### Admin/instructor UI
Responsibilities:
- list attempts and submissions
- show test results
- replay edit history
- later: manage rosters, classes, and problem assignments

### Authentication and identity
Authentication will use Firebase Auth.

Responsibilities:
- student and instructor sign-in
- identity for access control
- later: role-aware access to sessions, replay, and results

Important:
- prototype phases may temporarily use UUID-based access for local development
- production access should rely on authenticated identity rather than possession of a session UUID alone

## Recommended data model

### Core concepts
- **User**: student, instructor, admin
- **Class**: grouping of students/instructors
- **Problem**: coding question with language/runtime expectations
- **Exam session**: one timed sitting for one user on one assignment/problem set
- **Attempt snapshot**: saved code/history state at a point in time
- **Submission**: attempt sent for grading
- **Grade result**: structured outcome returned by grader
- **History batch**: append-only group of operation records uploaded from the client
- **Checkpoint**: full or partial reconstructed source state to accelerate replay

### Important modeling rule
Do not collapse session, attempt, submission, and result into a single table/object.
They represent different moments in the lifecycle and should remain distinguishable.

## Edit history model

### Recommendation
Use an operation-based history format, not raw keyboard events.

In the current implementation phases, Monaco content-change events are the canonical history source.
Richer annotations such as paste, selection, cursor movement, or focus changes may be added later.

Examples of useful events:
- insert text
- delete text
- replace range
- later: selection change
- later: cursor movement
- later: paste
- later: submission
- later: checkpoint created

Required metadata:
- sequence number
- client timestamp
- server receive timestamp where applicable
- language
- source version or document version
- problem/session identifiers

### Why operation-based history
- closer to the editor’s real state changes
- supports accurate replay
- handles paste and replace operations naturally
- more useful than raw keydown/keyup noise

## Persistence strategy

### Current phased strategy
The project is being built in stages:

1. **In-memory prototype**
   - record and replay Monaco history entirely in memory

2. **Local client/server API prototype**
   - batch history from the client to a local backend
   - store and retrieve session history using SQLite during local development

3. **Local Firestore validation**
   - replace or supplement SQLite with Firestore running via the local emulator
   - validate that the Firestore data model and API flow are a good fit before any cloud deployment
   - use the emulator to test session metadata, history batch writes, replay fetches, and local development workflows

4. **Hosted application path**
   - deploy the app/API on Cloud Run
   - use Firestore as the primary operational datastore for session-oriented history data
   - use Firebase Auth for user identity and access control
   - manage hosted infrastructure changes through repo-managed Terraform and a human-reviewed local `validate` → `plan` → `apply` workflow

### Firestore
Firestore is the primary planned operational datastore for hosted history/session data.

Use for:
- session metadata
- history batch documents
- session lookup and replay fetch
- later: user/session/problem metadata that fits a document-oriented model

Why Firestore:
- good fit for append-oriented session history
- low-maintenance managed service
- good match for Cloud Run’s stateless service model
- supports a strong local development story through the emulator before hosted deployment
- better aligned than object storage for structured session data

### Object storage
Object storage may be added later for:
- raw history archives
- full submission payloads
- checkpoints/snapshots
- grader logs
- stdout/stderr and related artifacts

Why:
- object storage is good for durable blobs and larger immutable artifacts
- Firestore is better for operational structured app data

## Current history sync flow

### Recommended near-term flow
1. student edits code locally
2. client records operation history
3. client batches history updates periodically
4. client sends history batches to the backend
5. backend stores ordered session history
6. replay client fetches history by session id
7. replay reconstructs editor contents from fetched history

### Why periodic batch upload
Compared with submission-only history upload, chunking:
- reduces risk of total data loss on browser crash
- improves audit trail durability
- keeps requests manageable
- avoids the overhead of per-keystroke live streaming

## Future submission and grading flow

### Planned flow
1. student edits code locally
2. client records operation history
3. client periodically uploads history batches
4. student submits code
5. backend stores submission metadata and payload references
6. backend enqueues grading work
7. grader fetches payload and hidden tests
8. grader runs tests in isolation
9. backend stores result and returns status to client/admin views

### Wave 12 execution prototype
Before UI integration or hidden tests, Python execution now uses a narrower prototype flow:
1. authenticated script submits Python source to the backend
2. backend stores a Firestore execution record separate from history/session data
3. backend dispatches an execution backend through an abstraction layer
4. Cloud Run Job runner claims queued work from Firestore
5. runner executes Python and stores stdout/stderr/result metadata back in Firestore
6. script polls the execution record until a terminal result is available

### Wave 13 integrated execution flow
Wave 13 keeps the same execution backend and stored-record contract, but connects it to the authenticated product UI:
1. signed-in user edits Python in the main Monaco page
2. UI submits the current Python source through the authenticated backend execution endpoint
3. backend creates or updates the durable Firestore execution record through the existing execution service
4. UI loads the latest stored execution record for the authenticated user
5. UI polls the stored record while it remains queued or running
6. UI renders stdout, stderr, exit status, duration, and truncation from the stored terminal result

Wave 13 intentionally shows only the latest execution result in the UI and does not add history browsing yet.

## Isolation model

### Main app environment
- normal web app/API development environment
- deployed on Cloud Run in the hosted environment
- stateless and not trusted for grading student code directly

### Data and identity environment
- Firestore for operational application data
- Firebase Auth for authentication and identity
- Firestore emulator for local validation before hosted deployment
- security rules and backend authorization should be used to protect user/session data

### Grader environment
- isolated execution environment
- hard time/memory/output limits
- no unnecessary credentials
- no broad filesystem access
- ideally no outbound network by default

The grader should be treated as a separate product surface.

## Language support

### Phase order recommendation
- Python
- JavaScript
- Java

Java is likely the most operationally complex due to compilation and class/file structure.
If delivery pressure rises, defer Java until the grading model is stable.

## Test management
Tests should be versioned in git and referenced by immutable identifiers such as:
- commit SHA
- version tag
- release artifact

Do not grade production submissions against floating branch heads.

## Observability
Collect at least:
- history batch counts
- replay fetch counts
- submission counts
- grading queue delay
- grading duration
- failure rate
- timeout rate
- storage growth
- replay reconstruction errors

Potential future integrity signals:
- number of paste events
- largest insertion
- idle gaps
- ratio of typed text to pasted text
- submission cadence

## Security posture
The system is not intended to eliminate cheating completely.
It should:
- preserve useful evidence of development behavior
- isolate student code execution
- protect test suites and grading infrastructure
- prevent ordinary cross-user data leaks

It should not be described as a perfect anti-cheat solution.

## Current architectural stance
Build the system in small vertical slices, but keep the long-term seams visible from the beginning:
- editor/history capture
- client/server history API
- client persistence and sync hardening
- grader execution
- admin/replay
- auth/roster

Key platform decisions:
- Cloud Run for the main hosted app/API
- Firestore for structured operational session/history data
- Firebase Auth for authentication and identity
- Firestore emulator as the validation step before any hosted GCP deployment
