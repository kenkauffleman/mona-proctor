# Current Phase

## Active phase
Phase 17: Java execution prototype

## Goal
Run user-submitted Java code in a restricted remote execution environment and return stdout/stderr results.

This phase should extend the existing execution system to support Java while preserving the same overall execution architecture, result contract, and ownership/authorization model already established for Python.

## In scope
- add Java execution submission flow behind the existing execution abstraction layer
- implement a Cloud Run Job-based execution path for Java
- validate the Java execution container locally before relying on hosted execution
- support script-driven submission and result retrieval for Java
- integrate Java execution into the authenticated UI after the non-UI path is validated first
- store Java execution metadata and results using the existing execution-record approach
- add configurable `.env` limits for Java execution
- document the Java execution prototype flow

## Out of scope
- Java hidden tests or grading
- multi-file Java projects
- Maven or Gradle support
- packages or complex project structure
- Java harness/wrapper generation
- broad execution-system redesign
- client persistence changes
- admin/instructor feature work

## Desired qualities
- same execution architecture as Python
- same result contract as Python
- simple and repeatable Java compile/run flow
- clear local-first validation before hosted execution
- minimal special casing outside the Java runtime adapter
- UI integration only after the non-UI path is proven

## Design constraints
- target Java 25
- use a small, boring Java 25 JDK-based execution image suitable for both compile and run
- use the same execution abstraction layer already established for Python
- validate the Java execution container locally first
- keep the execution backend swappable
- use a fixed submission contract for this phase:
  - user submits one source file
  - user is expected to provide a public `Main` class
  - user is expected to provide `public static void main(String[] args)`
- do not support packages in this phase
- treat compile failures as normal execution results using the shared result contract
- use Java-specific `.env` settings for timeout/memory/source-size defaults where appropriate
- keep the existing one-active-execution-per-authenticated-user rule

## Result contract guidance
Reuse the same shared result shape already used for execution flows, including at least:
- `status`
- `stdout`
- `stderr`
- `exitCode`
- `durationMs`
- `truncated`

Compile errors should be surfaced through the same result flow and displayed in the same result area as normal execution results.

## Suggested deliverables
- Java runtime adapter behind the existing execution abstraction
- Java Cloud Run Job execution implementation
- local validation path for the Java execution container
- script-driven Java submission/result retrieval flow
- authenticated UI integration for Java execution after non-UI validation passes
- Java-specific execution configuration via `.env`
- updated docs/scripts for running and validating the Java execution prototype

## Exit criteria
- an authenticated user can submit Java code through a script-driven flow
- execution is performed remotely through the configured execution backend
- stdout/stderr, exit status, duration, and truncation state are returned and stored
- the Java execution container is validated locally before relying on hosted execution
- the non-UI path is validated first, then UI integration is completed in the same wave
- one active execution per authenticated user is enforced
- the Java execution prototype is documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not add Java grading yet
- do not add multi-file or package support
- do not introduce Maven or Gradle
- do not invent a Java wrapper/harness in this phase
- rely on the user to supply `Main` and `main` correctly for now
- validate the Java container locally before treating hosted execution as proven
- keep UI integration similar to Python and show only the latest execution result

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- add Java stdout-based grading
- keep Java execution on the same architectural rails as Python
- introduce a more structured Java submission harness later if needed