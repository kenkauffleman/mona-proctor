# Current Phase

## Active phase
Phase 18: Java stdout-based tests and grading

## Goal
Extend the Java execution system from raw code execution into grading based on expected stdout results.

This phase should build directly on the Java execution prototype and add a simple, repeatable grading flow using hidden stdout-based test cases. The purpose is to prove end-to-end Java grading without introducing a full problem model, unit-test framework, or richer harness system yet.

## In scope
- add stdout-based test execution flow for Java
- add structured grading result format for Java
- add grading-oriented result storage and retrieval
- integrate Java grading into the existing product flow and UI
- use a backend-owned sample Java problem and hidden test cases
- document the Java grading flow

## Out of scope
- JUnit or other Java unit-test framework integration
- multi-file Java projects
- packages
- Maven or Gradle
- generic problem management UI or data model
- partial-credit or rubric systems
- rich diff-based feedback
- Python grading work
- client persistence changes

## Desired qualities
- simple and repeatable grading flow
- minimal divergence from the existing Java execution architecture
- clear grading result contract
- straightforward per-test reporting
- predictable comparison behavior
- strong local validation before relying on hosted/manual checks

## Design constraints
- keep the Java submission contract from the execution wave:
  - one submitted source file
  - public class `Main`
  - `public static void main(String[] args)`
  - no packages
- use a backend-owned seam such as `getProblemById(problemId)`
- for this phase, `getProblemById` may always return the same sample Java problem
- the hardcoded sample problem for this phase should be a Fibonacci problem
- use hidden stdout-based test cases owned by the backend, not the executor
- perform grading by comparing actual stdout to expected stdout
- use one fresh execution per test case
- compile failure should be represented through the same structured grading result flow
- normalize line endings and tolerate trivial trailing-newline differences, but otherwise keep stdout comparison strict

## Suggested deliverables
- backend-owned sample Java Fibonacci problem definition
- hidden stdout-based test execution flow for Java
- structured grading result format and storage
- UI integration for Java grading results
- per-test result display and overall pass/fail summary
- docs/scripts updates needed for repeatable Java grading validation

## Exit criteria
- sample Java problems can be graded end-to-end using stdout-based expectations
- structured grading results are returned correctly
- grading flow is documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not add JUnit or method-signature harnesses yet
- do not add a real problem data model yet
- for now, the backend should return the same sample Java Fibonacci problem regardless of requested problem id
- prefer one fresh execution per hidden test case
- keep UI feedback modest:
  - overall pass/fail summary
  - per-test pass/fail results
  - compile failure surfaced clearly in the same grading result flow
- prioritize strong local and emulator-backed validation before relying on hosted/manual checks

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- expand Java grading beyond stdout-only cases later
- swap the hardcoded problem seam to real problem retrieval later
- continue building Java features on the same execution/grading rails