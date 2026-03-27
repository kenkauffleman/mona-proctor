# Current Phase

## Active phase
Phase 10: Local Firebase Auth validation

## Goal
Validate the application-level authentication flow locally before introducing hosted browser-to-backend authenticated access.

This phase is intentionally narrow. The purpose is to prove that the frontend can sign in locally with the Firebase Auth emulator, obtain an ID token, send it to the backend, and that the backend can verify the token and enforce basic resource ownership rules against the existing local browser ↔ backend ↔ Firestore flow.

## In scope
- set up the local Firebase Auth emulator
- create local test users and a local sign-in flow
- acquire Firebase ID tokens in the frontend during local development
- send Firebase ID tokens from the frontend to the backend
- verify Firebase ID tokens in the backend during local development
- link sessions to authenticated users in the data model
- add the minimum user/session ownership logic needed for authenticated local validation
- document the local authenticated flow and how to run it

## Out of scope
- hosted frontend integration
- hosted browser-to-backend auth flow
- Cloud Run public access changes
- App Check
- Cloud Armor
- polished production auth UX
- full role and roster system
- advanced authorization policy design
- grader integration
- client persistence changes

## Desired qualities
- minimal but correct application-level auth flow
- simple and repeatable local setup
- backend authorization based on verified identity, not just session UUIDs
- clear separation between authentication, authorization, and persistence logic
- easy local debugging and validation

## Design constraints
- keep the local auth flow aligned with the future hosted frontend architecture
- use Firebase Auth emulator for local validation
- use Firebase ID tokens from the frontend and backend token verification
- treat Firebase `uid` as the canonical identity key
- keep the user model and ownership model minimal for this phase
- do not overdesign instructor/admin roles yet

## Recommended implementation direction
- start with a simple provider such as email/password in the emulator
- add a minimal authenticated frontend experience:
  - sign-in
  - sign-out
  - auth loading state
- update the backend to verify bearer tokens
- add only the minimum user/session ownership checks needed for this phase
- keep the implementation compatible with a statically hosted frontend later

## Suggested deliverables
- local Auth emulator setup
- local test users and sign-in flow
- frontend acquisition and sending of Firebase ID tokens
- backend verification of Firebase ID tokens
- minimal user/session ownership model
- documentation for the local authenticated flow
- updated scripts and script guide entries as needed for local auth validation

## Exit criteria
- a local user can sign in through the Auth emulator
- the frontend can acquire and send a Firebase ID token to the backend
- the backend can verify the token locally
- authenticated local browser ↔ backend ↔ Firestore behavior is validated
- the local auth workflow is documented and repeatable

## Notes for the agent
- keep this phase narrowly scoped
- do not start hosted auth flow yet
- do not add broad role/claims systems yet
- do not rely on session UUID alone for authorization anymore
- keep the user/session data model changes minimal and explicit
- structure the code so auth verification and authorization checks are testable independently

## Handoff to the next phase
At the end of this phase, the codebase should make it easy to:
- carry the same auth model into the hosted frontend flow
- protect browser-to-backend access with authenticated identity
- extend user/session authorization later without redesigning the auth foundation