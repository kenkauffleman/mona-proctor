# Current Phase

## Active phase
Phase 16: Dependency and security update wave

## Goal
Update outdated dependencies, reduce known security vulnerabilities, and keep the project on a healthier baseline before adding more execution/grading features.

This phase is intentionally focused on dependency hygiene, compatibility, and security-related updates. It is not a feature-development wave.

## In scope
- inventory current dependencies and identify outdated or vulnerable ones
- research current stable replacement/upgrade targets
- use npm’s built-in tooling to inspect dependency health and vulnerabilities
- update dependencies where practical
- make targeted code changes needed to preserve behavior after the updates
- update docs/scripts if dependency changes affect workflows
- keep the existing system working under the strengthened test stack
- inspect build/test logs for warnings or suspicious messages introduced or revealed by the updates

## Out of scope
- new product features
- broad architectural redesign
- speculative refactors unrelated to dependency updates
- execution/grading feature expansion
- large cleanup/removal passes unless directly required by dependency updates

## Desired qualities
- stable and reasonably modern dependency versions
- reduction of known security vulnerabilities
- minimal behavior change
- compatibility preserved across the existing stack
- clear documentation of important dependency-related workflow changes
- high confidence from full automated validation
- attention to warnings surfaced during builds and tests, not just hard failures

## Design constraints
- prefer stable versions over bleeding-edge versions
- prefer versions that are reasonably modern and do not introduce known security issues where practical
- use online research to choose upgrade targets rather than guessing
- use npm’s built-in vulnerability tooling as part of the assessment
- inspect logs/warnings produced during install, build, and test commands
- keep dependency updates scoped and justified
- preserve existing behavior unless a small compatibility fix is required
- do not ignore failing tests or validation checks
- do not declare success unless the full test stack passes

## Suggested deliverables
- dependency inventory/update plan
- npm-based vulnerability assessment results
- dependency version updates
- targeted compatibility fixes required by the updates
- updated docs/scripts where dependency changes affect developer workflows
- summary of important dependency/security improvements and notable warnings investigated

## Exit criteria
- outdated dependencies with important or security-relevant issues are updated or explicitly documented
- npm-based vulnerability checks have been run and reviewed
- build/test/install warnings have been reviewed and important ones addressed or documented
- the project still builds, tests, and runs after the updates
- all relevant automated checks pass
- dependency-related workflow changes are documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- search online for current stable versions before making upgrade decisions
- prefer stable, reasonably modern versions with no known security issues where practical
- do not guess package versions from memory
- use npm’s built-in tooling to detect vulnerabilities
- pay attention to warnings in command output, not just fatal errors
- do not use dependency updates as an excuse for broad refactoring
- run the full test stack before declaring success
- if some dependency cannot be safely upgraded now, document the reason clearly
- be explicit in the final report about what was upgraded, what was deferred, and why

## Handoff to the next phase
At the end of this phase, the codebase should be on a healthier and more secure dependency baseline for Java execution work.