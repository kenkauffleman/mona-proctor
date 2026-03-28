# Current Phase

## Active phase
Phase 15: Cleanup and refactor under test protection

## Goal
Remove outdated scaffolding, simplify the codebase, and perform targeted refactors now that stronger automated validation exists.

This phase is intentionally focused on cleanup, maintainability, and alignment between the codebase and the now-formalized test/documentation stack. It is not a redesign wave.

## In scope
- remove outdated or superseded files/scripts where they are clearly no longer needed
- clean up duplicate or conflicting validation/setup paths where appropriate
- perform targeted refactors that improve maintainability, clarity, or testability
- fix bugs encountered during cleanup/refactor work when they are small and clearly scoped
- align docs with the cleaned-up structure and current workflows
- keep the strengthened test stack green throughout the cleanup

## Out of scope
- broad architectural redesign
- new product features
- changes to core execution/grading scope
- large behavior changes
- speculative rewrites
- aggressive deletion of ambiguous historical assets
- Java execution/grading work
- client persistence work

## Desired qualities
- simpler repo structure
- fewer duplicate or outdated scripts
- clearer boundaries between active and obsolete paths
- small, understandable refactors
- strong confidence from the existing automated tests
- documentation that matches reality

## Design constraints
- use the strengthened test suite as the safety net for cleanup work
- remove only files/scripts that are clearly obsolete, superseded, or conflicting
- if an item is ambiguous, prefer leaving it in place or documenting it rather than deleting it aggressively
- keep refactors local and purposeful
- do not change external behavior unless required for a small bug fix or cleanup correctness issue
- keep human-facing commands explicit and target `prod` where applicable, consistent with repo guidance

## Suggested deliverables
- removal of clearly obsolete or superseded files/scripts
- targeted maintainability refactors
- updated docs that reflect the cleaned-up structure
- narrowly scoped bug fixes discovered during cleanup
- confirmation that the strengthened test stack still passes

## Exit criteria
- outdated or redundant files/scripts are removed where appropriate
- refactors preserve current behavior under the strengthened test suite
- docs reflect the cleaned-up structure and current workflows
- the codebase is easier to reason about for future waves

## Notes for the agent
- keep this phase narrowly scoped
- do not treat cleanup as permission to redesign the system
- do not remove ambiguous files aggressively
- prefer local, mechanical improvements over sweeping rewrites
- preserve behavior unless a small bug fix is necessary
- use the existing test stack to validate every meaningful cleanup/refactor step
- be explicit in the final report about what was removed and why

## Handoff to the next phase
At the end of this phase, the codebase should be in a cleaner, easier-to-maintain state for Python hidden tests and grading.