# AGENTS.md

## Project
Web-based coding assessment platform with Monaco, remote grading, and replayable edit history.

## Workflow
Build incrementally. Do not implement the whole system at once.
Focus only on the active phase in `docs/current-phase.md` unless explicitly told otherwise.

## Priorities
Preserve clean boundaries between:
- web/editor UI
- submission API
- storage
- grader
- admin UI

## Commands
- install: `npm install`
- dev: `npm run dev`
- test: `npm test`
- lint: `npm run lint`

Additional agent-facing script guidance lives in `docs/agent-scripts.md`.

## Rules
- Prefer TypeScript for app code.
- Keep changes narrow and reviewable.
- Update docs when architecture changes.

## Verification
- Add or update tests for non-trivial changes.
- Prefer the smallest sensible test layer.
- Bug fixes should include a regression test.
- Before finishing, run tests, lint, and typecheck for the changed area.
- Report the commands run and the results.

## Development Environment
Development usually happens in GitHub Codespaces, not on a local machine. Assume a remote container environment: use commands that work in-container, bind dev servers to an accessible host when needed, and remember that localhost access may require Codespaces port forwarding or the browser preview URL!
