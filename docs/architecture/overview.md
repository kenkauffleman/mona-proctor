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
- create checkpoints/snapshots
- submit source and history
- show grading results
- later: handle login, timers, and student exam flow

Likely stack:
- TypeScript
- React or similar frontend framework
- Monaco editor

### App/API backend
Responsibilities:
- create and manage sessions
- receive history chunks and submissions
- validate and persist metadata
- write raw artifacts to object storage
- enqueue grading jobs
- return grading status/results
- serve admin data

Likely stack:
- TypeScript backend
- relational database
- object storage
- queue/job orchestration

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

### Admin/instructor UI
Responsibilities:
- list attempts and submissions
- show test results
- replay edit history
- later: manage rosters, classes, and problem assignments

## Recommended data model

### Core concepts
- **User**: student, instructor, admin
- **Class**: grouping of students/instructors
- **Problem**: coding question with language/runtime expectations
- **Exam session**: one timed sitting for one user on one assignment/problem set
- **Attempt snapshot**: saved code/history state at a point in time
- **Submission**: attempt sent for grading
- **Grade result**: structured outcome returned by grader
- **History chunk**: operation log segment uploaded from the client
- **Checkpoint**: full or partial reconstructed source state to accelerate replay

### Important modeling rule
Do not collapse session, attempt, submission, and result into a single table/object.
They represent different moments in the lifecycle and should remain distinguishable.

## Edit history model

### Recommendation
Use an operation-based history format, not raw keyboard events.

Examples of useful events:
- insert text
- delete text
- replace range
- selection change
- cursor movement
- paste
- submission
- checkpoint created

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

### Relational database
Use for:
- users
- classes
- rosters
- problems
- sessions
- submissions
- result summaries
- pointers to stored artifacts

### Object storage
Use for:
- raw history chunks
- full submission payloads
- checkpoints/snapshots
- grader logs
- stdout/stderr and related artifacts

### Why both
Object storage is good for durable blobs.
A relational database is better for indexing, filtering, querying, and powering admin pages.

## Submission flow

### Recommended flow
1. student edits code locally
2. client records operation history
3. client periodically uploads history chunks
4. student submits code
5. backend stores submission metadata and payload references
6. backend enqueues grading job
7. grader fetches payload and hidden tests
8. grader runs tests in isolation
9. backend stores result and returns status to client/admin views

### Why periodic chunk upload
Compared with submission-only history upload, chunking:
- reduces risk of total data loss on browser crash
- improves audit trail durability
- keeps submissions smaller
- still avoids the overhead of per-keystroke live streaming

## Isolation model

### Main app environment
- normal web app/API development environment
- not trusted for grading student code

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
- submission/storage API
- grader execution
- admin/replay
- auth/roster