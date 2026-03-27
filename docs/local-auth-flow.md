# Local Authenticated Flow

## Purpose
Wave 10 validates local application-level auth before the hosted frontend flow exists.

The goal is to prove all of the following locally:
- a user can sign in with the Firebase Auth emulator
- the frontend can obtain a Firebase ID token
- the frontend sends that token to the backend
- the backend verifies the token
- session history is linked to the authenticated Firebase `uid`
- basic per-session ownership is enforced

## Local components
- Firebase Auth emulator on `127.0.0.1:9099`
- Firestore emulator on `127.0.0.1:8080`
- Vite frontend on `127.0.0.1:5173`
- backend API on `127.0.0.1:8081`

## Seeded local users
Run `npm run auth:seed` while the emulators are running.

Default users:
- `student1@example.com` / `pass1234`
- `student2@example.com` / `pass1234`

## Manual local workflow
1. Start the emulators with `npm run emulator:local`
2. In another terminal, seed the auth users with `npm run auth:seed`
3. In another terminal, start the app stack with `npm run dev`
4. Open the frontend and sign in with one of the seeded users
5. Type in the recording editor so the frontend uploads authenticated history batches
6. Open the replay page for the same session UUID and verify it loads
7. Sign out and sign back in as the other seeded user
8. Try loading the first user's session UUID and confirm the backend rejects access

## Authenticated request flow
1. The frontend signs in with email/password against the Auth emulator.
2. The Firebase client SDK issues an ID token for the signed-in user.
3. The history client sends that ID token as `Authorization: Bearer <token>`.
4. The backend verifies the token with `firebase-admin`.
5. The backend treats the verified Firebase `uid` as the canonical identity key.
6. When a session is first written, the backend stores that `uid` as `ownerUid`.
7. Later append/load requests must come from the same verified `uid`.

## Data model changes in this wave
- session metadata now stores `ownerUid`
- history append responses now include `ownerUid`
- history load responses now include `ownerUid`

This wave intentionally does not add:
- roles
- claims-based authorization
- roster or class membership logic
- hosted auth/browser deployment concerns

## Carry-forward into Wave 11
Wave 11 reuses this same identity and authorization model in the hosted environment:
- the browser still acquires a Firebase ID token
- the backend still verifies that token
- session ownership still relies on `ownerUid`
- cross-user access to another user's session is still denied

The main Wave 11 changes are hosting, explicit CORS, and using real hosted Firebase/Auth and Firestore services instead of emulators.

## Repeatable validation
Use `npm run wave10:validate`.

That script starts the Auth and Firestore emulators, seeds local users, signs in two users programmatically, verifies one user can create and load a session, and verifies the second user is denied access to that session.
