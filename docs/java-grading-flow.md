# Java Grading Flow

## Purpose
Wave 18 extends the Wave 17 Java execution prototype into backend-owned stdout grading for one sample Java problem.

The goal is to prove:
- end-to-end Java grading through the existing product flow
- backend-owned hidden test cases
- structured grading results stored separately from raw execution records
- compile failures represented through the same grading result contract

## Fixed Java submission contract
Wave 18 keeps the Wave 17 Java execution constraints:
- one submitted source file
- public class `Main`
- `public static void main(String[] args)`
- no packages
- no multi-file support

## Problem seam
The backend now owns a temporary seam:

```ts
getProblemById(problemId)
```

For Wave 18, that seam always returns the same sample Java Fibonacci problem:
- read one non-negative integer from stdin
- print the nth Fibonacci number to stdout
- hidden test cases stay in the backend

## High-level flow
1. The Java UI submits `POST /api/java-grading/jobs` with `problemId` and `source`.
2. The backend creates a stored `javaGradingJobs` record in `queued` state.
3. The Java grading service loads the backend-owned Fibonacci problem through `getProblemById(problemId)`.
4. For each hidden test case, the grading service submits one fresh internal Java execution job with the hidden stdin for that test.
5. The existing Java runner compiles and runs `Main.java` for that one test case.
6. The grading service compares actual stdout to expected stdout after:
   - normalizing `\r\n` to `\n`
   - ignoring trailing newline-only differences
7. The grading service stores a structured result in the parent Java grading record.
8. The UI polls the stored Java grading job and renders the overall summary plus per-test pass/fail status.

## Structured grading result
Each Java grading job stores:
- `compileFailed`
- `overallStatus`
- `summary`
- `passedTests`
- `totalTests`
- `tests[]`

Each per-test result stores:
- `testId`
- `status`
- `actualStdout`
- `expectedStdout`
- `stderr`
- `exitCode`
- `executionStatus`

Compile failures use the same grading result flow:
- the first test result is recorded as an error
- remaining tests are marked `not_run`
- `compileFailed` is set to `true`

## Storage model
Wave 18 stores:
- user-facing Java grading records in `javaGradingJobs`
- internal child Java executions in the existing `executionJobs` path

This keeps grading-oriented retrieval separate while still reusing the proven execution backend.

## Local validation
Run the focused Wave 18 emulator-backed validator:

```bash
npm run wave18:validate
```

That script verifies:
- authenticated Java grading submission
- passing Fibonacci grading
- compile failure aggregation
- stored structured grading results
- denied cross-user access

Before finishing broader work, also run:

```bash
npm run test:local
npm run lint
npm run typecheck
```

## UI behavior
Wave 18 keeps the Java grading UI modest:
- Java uses `Grade Java` instead of raw `Run Java`
- the page shows one overall pass/fail summary
- the page shows per-test pass/fail results
- compile failures are visible in the same grading result area
- no diff view or advanced feedback is included yet
