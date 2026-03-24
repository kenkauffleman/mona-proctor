# Current Phase

## Active phase
Phase 1: Monaco editor page

## Goal
Create a minimal but clean web application that renders a Monaco editor for Python, Java, and JavaScript.

This phase should establish a good foundation for later history tracking and backend integration, but it should not try to implement the full system.

## In scope
- scaffold the web app
- choose the frontend framework and basic project structure
- render Monaco in a dedicated page or view
- support switching between Python, Java, and JavaScript
- maintain source state per language or per editor session
- create a small amount of UI framing so the app is easy to extend later

## Out of scope
- auth
- rosters
- backend submission
- cloud storage
- grader execution
- replay UI
- full anti-cheat logic
- full exam timer/policy system

## Desired qualities
- simple and readable structure
- clear separation between editor component and app shell
- easy place to add history capture in the next phase
- no premature infrastructure complexity

## Suggested deliverables
- app shell with route or page for the editor
- Monaco editor component
- language selector
- starter source templates for Python, Java, JavaScript
- basic documentation for how to run the app locally

## Exit criteria
- app runs locally in the dev environment
- Monaco loads reliably
- switching languages works
- source editing works without major glitches
- code organization is good enough to begin Phase 2 cleanly

## Notes for the agent
- do not implement history persistence yet
- do not add backend endpoints yet
- do not overbuild admin/auth scaffolding
- prefer small, reviewable commits/changes
- when making structural choices, optimize for the next phase: client-side edit history capture

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to add:
- editor event listeners
- operation-based history capture
- checkpoints/snapshots
- submission triggers