# Local Client/Server History Prototype

## Purpose
Phase 3 proves that Monaco model content-change events can remain the canonical edit-history stream while crossing a real client/server boundary.

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

### Append events
`POST /api/history/sessions/:sessionId/events`

Request body:

```json
{
  "language": "python",
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
  "acceptedEvents": 1,
  "totalEvents": 1
}
```

### Load a session
`GET /api/history/sessions/:sessionId`

Response body:

```json
{
  "sessionId": "uuid",
  "language": "python",
  "events": []
}
```

## Recording approach
- The recording page starts each session from an empty document.
- The client generates a UUID with `crypto.randomUUID()`.
- The record editor subscribes to Monaco `model.onDidChangeContent`.
- Recorded events are queued into a reusable batcher and uploaded to the backend every few seconds.
- The backend stores session metadata and event payloads in SQLite.

## Replay approach
- The replay page fetches a complete session by UUID.
- Reconstruction starts from an empty document and applies events in `sequence` order.
- Each change uses Monaco's `rangeOffset`, `rangeLength`, and `text` fields to rebuild the document deterministically.
- Timed replay reuses the original timestamp gaps for playback.
- If Monaco reports an end-of-line change, replay normalizes line endings to the event's `eol` value.

## Storage approach
- SQLite stores one row per session and one row per event.
- Event rows are keyed by `(session_id, sequence)` so repeated uploads for the same batch do not duplicate history.
- Events are returned ordered by `sequence`.

## Current limitations
- History still tracks only Monaco model content changes.
- The local backend is for development and API validation only.
- The prototype does not yet capture selections, cursors, or richer metadata.
