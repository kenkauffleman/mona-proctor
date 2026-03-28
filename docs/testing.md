# Testing guide

## Purpose
This project should grow with automated tests alongside implementation.
Tests are part of the deliverable, not an optional cleanup step.

## Testing goals
- catch regressions early
- make refactoring safer
- verify user-visible behavior
- keep feedback loops fast enough for iterative agent-driven development

## Preferred testing order
Choose the smallest test layer that gives confidence.

1. Unit tests
   - use for pure functions, utilities, parsers, transformers, reducers, and other isolated logic
   - these should be the default for non-UI business logic

2. Component tests
   - use for React/UI behavior
   - verify rendering, interaction, state changes, callbacks, validation, and visible output
   - prefer these over end-to-end tests for most UI work

3. Integration tests
   - use when verifying boundaries between meaningful pieces of the system
   - examples:
     - editor state + history capture
     - API handler + persistence layer
     - submission flow with mocked grader boundary

4. End-to-end tests
   - use only for major user flows or especially risky paths
   - keep these few and high-value because they are slower and more brittle

## General expectations
- New logic should usually come with tests.
- Bug fixes should include regression tests.
- Tests should be narrow, readable, and intentionally scoped.
- Prefer deterministic tests.
- Avoid overly broad snapshots.
- Avoid testing implementation details when user-visible behavior can be tested instead.

## Frontend testing guidance
For UI code:
- test what the user can see or do
- prefer queries and assertions based on visible labels, roles, and text
- avoid coupling tests tightly to DOM structure unless structure is the behavior
- when possible, test Monaco-related wrapper behavior at your component boundary rather than Monaco internals

## Monaco-specific guidance
The Monaco editor itself is a complex third-party component.
Do not try to exhaustively test Monaco internals.

Instead:
- test your editor wrapper
- test language switching behavior
- test source state updates
- test event wiring that your code owns
- mock Monaco where appropriate in unit/component tests
- reserve full browser validation for only the most important flows

## Completion standard
A task is not complete until all of the following are true:
1. relevant tests were added or updated
2. the smallest relevant test suite was run
3. lint was run for the changed area
4. typecheck was run for the changed area
5. the final report includes:
   - tests added or changed
   - commands run
   - results
   - any remaining test gaps or tradeoffs

## When automated tests are difficult
If a change is genuinely hard to test automatically:
- explain why
- add the closest practical coverage
- document what remains unverified
- do not silently skip verification

## Suggested default workflow for the agent
For most tasks:
1. read `AGENTS.md` and `docs/current-phase.md`
2. make a small plan
3. implement the smallest useful slice
4. add or update tests
5. run targeted tests first
6. run lint and typecheck
7. summarize changes, verification, and remaining gaps

## Wave 14 local test stack
Wave 14 formalizes the local validation layers around the current authenticated Python flow.

Preferred local order:
1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run test:e2e`
4. `npm run lint`
5. `npm run typecheck`

Use `npm run test:local` when you want the full local unit + emulator-backed integration + Playwright pass in one command.

### Layer meanings
- `npm run test:unit`
  - runs the Vitest unit and component suite under `src/` and `backend/`
  - fastest feedback for local logic and UI behavior
- `npm run test:integration`
  - starts the Firestore and Auth emulators through `firebase emulators:exec`
  - runs backend/auth/Firestore/execution integration tests under `tests/integration/`
  - validates authenticated backend flows plus Firestore persistence
- `npm run test:e2e`
  - starts the Firestore and Auth emulators through `firebase emulators:exec`
  - launches a local frontend/backend test stack plus the local Python runner image
  - runs Playwright against a small set of stable high-value user flows

### Browser test scope
Playwright coverage should stay intentionally small:
- authenticated happy path
- execution submission and result display
- one important local guardrail or error path
- one authorization sanity check

Avoid turning Wave 14 browser tests into broad layout snapshots or Monaco-internals tests.

## Testing philosophy for this project
This project is phase-based and should not be overbuilt early.
Testing should follow that same principle:
- add enough coverage to make the current phase reliable
- do not build a giant testing framework before it is needed
- prefer small, useful tests over elaborate but fragile suites
