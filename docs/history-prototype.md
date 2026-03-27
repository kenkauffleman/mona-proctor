# Local Authenticated History Prototype

## Purpose
Wave 10 proves that Monaco model content-change events can remain the canonical edit-history stream while crossing the authenticated browser/client, backend API, and Firestore boundary.

## Event shape
Each recorded event stores:

- `sequence`
- `timestamp`
- `versionId`
- `isUndoing`
- `isRedoing`
- `isFlush`
- `isEolChange`
- `eol`
- `changes`

Each entry in `changes` stores:

- `rangeOffset`
- `rangeLength`
- `text`
- `range`

## API shape

### Append batch
`POST /api/history/sessions/:sessionId/batches`

Request body:

```json
{
  "language": "python",
  "batchSequence": 1,
  "eventOffset": 0,
  "events": [
    {
      "sequence": 1,
      "timestamp": 1700000000000,
      "versionId": 2,
      "isUndoing": false,
      "isRedoing": false,
      "isFlush": false,
      "isEolChange": false,
      "eol": "\n",
      "changes": []
    }
  ]
}
```

Response body:

```json
{
  "sessionId": "uuid",
  "batchSequence": 1,
  "acceptedEvents": 1,
  "totalEvents": 1,
  "totalBatches": 1,
  "ownerUid": "firebase-uid"
}
```

### Load a session
`GET /api/history/sessions/:sessionId`

Response body:

```json
{
  "sessionId": "uuid",
  "language": "python",
  "ownerUid": "firebase-uid",
  "batches": [
    {
      "batchSequence": 1,
      "eventOffset": 0,
      "eventCount": 1,
      "uploadedAt": "2026-03-26T00:00:00.000Z"
    }
  ],
  "events": []
}
```

## Recording approach
- The recording page starts each session from an empty document.
- The client generates a UUID with `crypto.randomUUID()`.
- The user signs in locally with the Firebase Auth emulator before using the history flow.
- The record editor subscribes to Monaco `model.onDidChangeContent`.
- Recorded events are queued into a reusable batcher and uploaded to the backend every few seconds as append-only authenticated batches.
- Each uploaded batch includes a `batchSequence` and `eventOffset` so retries and ordering stay inspectable.
- The frontend sends a Firebase ID token as a bearer token with each history request.
- The backend verifies the token and stores session metadata and history batches separately in Firestore.
- Each session metadata document now includes the authenticated owner's Firebase `uid` as `ownerUid`.

## Replay approach
- The replay page fetches a complete session by UUID for the currently authenticated user.
- Reconstruction starts from an empty document and applies events in `sequence` order.
- Each change uses Monaco's `rangeOffset`, `rangeLength`, and `text` fields to rebuild the document deterministically.
- Timed replay reuses the original timestamp gaps for playback.
- If Monaco reports an end-of-line change, replay normalizes line endings to the event's `eol` value.

## Storage approach
- Firestore stores one metadata document per session in `historySessions`.
- Each session metadata document stores `ownerUid` for basic ownership enforcement.
- Each session stores uploaded history batches in a `batches` subcollection keyed by `batchSequence`.
- Retrying the same batch sequence with the same payload is idempotent.
- Reusing a batch sequence with different payload is rejected as a conflict.
- Access from a different authenticated Firebase `uid` is rejected.
- Replay loads batches ordered by `batchSequence` and flattens their canonical Monaco events for deterministic reconstruction.

## Current limitations
- History still tracks only Monaco model content changes.
- The backend API is still intentionally minimal and development-oriented.
- The prototype does not yet capture selections, cursors, or richer metadata.
