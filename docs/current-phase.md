### Phase 14: Test infrastructure and local validation hardening
Goal: strengthen confidence in the current system by expanding automated test coverage and formalizing local validation workflows.

Deliverables:
- expanded unit test coverage for current behavior
- formalized integration tests for backend, auth, Firestore, and execution flows
- local end-to-end tests using Playwright
- repeatable local/emulator-backed validation workflow
- targeted bug fixes required to make the new tests pass
- updated scripts and documentation for running the test stack

Exit criteria:
- unit, integration, and local e2e tests cover the key current flows
- local and emulator-backed validation is documented and repeatable
- bugs directly exposed by the new tests are fixed
- the repo has a stronger testing foundation for later cleanup and refactoring

### Phase 15: Cleanup and refactor under test protection
Goal: remove outdated scaffolding, simplify the codebase, and perform targeted refactors now that stronger automated validation exists.

Deliverables:
- removal of outdated or superseded files/scripts where appropriate
- targeted refactors to improve maintainability
- cleanup of docs to match the current architecture and workflows
- bug fixes discovered during cleanup/refactor work

Exit criteria:
- outdated or redundant files/scripts are removed where appropriate
- refactors preserve current behavior under the strengthened test suite
- docs reflect the cleaned-up structure and current workflows
- the codebase is easier to reason about for future waves

### Phase 16: Python hidden tests and grading
Goal: extend the Python execution system from raw code execution into real grading against hidden tests.

Deliverables:
- hidden test execution flow for Python
- structured grading result format
- grading-oriented result storage and retrieval
- documentation for the Python grading flow

Exit criteria:
- sample Python problems can be graded end-to-end
- structured grading results are returned correctly
- grading flow is documented and repeatable

### Phase 17: Java execution prototype
Goal: run user-submitted Java code in a restricted remote execution environment and return stdout/stderr results without yet integrating the flow into the UI.

Deliverables:
- Java execution submission flow behind the same execution abstraction layer
- Cloud Run Job-based execution path for Java
- Firestore-backed storage for Java execution job metadata and results
- script-driven submission and result retrieval flow
- configurable limits via `.env` for Java execution
- documentation for the Java execution prototype flow

Exit criteria:
- an authenticated user can submit Java code through a script-driven flow
- execution is performed remotely through the configured execution backend
- stdout/stderr, exit status, duration, and truncation state are returned and stored
- no UI integration is required in this phase
- one active execution per authenticated user is enforced
- the Java execution prototype is documented and repeatable

### Phase 18: Java hidden tests and grading
Goal: extend the Java execution system from raw code execution into real grading against hidden tests.

Deliverables:
- hidden test execution flow for Java
- structured grading result format for Java
- grading-oriented result storage and retrieval
- documentation for the Java grading flow

Exit criteria:
- sample Java problems can be graded end-to-end
- structured grading results are returned correctly
- grading flow is documented and repeatable

### Phase 19: Client persistence and sync hardening
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

### Phase 20: Admin attempt listing
Goal: allow instructors/admins to view saved attempts.

Deliverables:
- admin auth placeholder or instructor-only access path
- attempt list page
- filters by class, student, problem, date
- links to submission details

Exit criteria:
- saved attempts can be found quickly
- metadata indexing is sufficient for normal class use

### Phase 21: Instructor replay and inspection UI
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

### Phase 22: User accounts and roster system
Goal: support real student login and class management.

Deliverables:
- user accounts
- instructor/admin roles
- class and roster management
- exam/session assignment

Exit criteria:
- students can log in and access assigned work
- instructors can manage rosters and exam availability

### Phase 23: Results and instructor dashboards
Goal: present grades and replayable attempts together.

Deliverables:
- student result summaries
- per-problem results
- replay link per attempt
- export or summary views for instructors

Exit criteria:
- instructors can see both outcomes and development history in one workflow

### Phase 24: Git-based test management
Goal: make problem and test authoring manageable and reproducible.

Deliverables:
- test definitions in git
- version pinning by commit SHA or release tag
- workflow for activating new tests
- reproducible mapping from submission to grader/test version

Exit criteria:
- tests are traceable and reproducible
- grader runs can be tied to immutable test versions