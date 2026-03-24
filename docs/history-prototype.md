# In-Memory History Prototype

## Purpose
Phase 2 proves that Monaco model content-change events can serve as the canonical edit-history stream for later replay and persistence work.

## Prototype shape
Each recorded event is stored in memory with:

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

## Recording approach
- Both demo editors begin empty for each language.
- The record editor subscribes to Monaco `model.onDidChangeContent`.
- Each Monaco content-change event is serialized into a plain object and pushed into an in-memory array.
- The page keeps this prototype local to the browser with no persistence or server upload.

## Replay approach
- Replay starts from an empty document.
- Recorded events are applied in `sequence` order.
- Each change uses Monaco's `rangeOffset`, `rangeLength`, and `text` fields to rebuild the document deterministically.
- The `Watch Replay` control schedules each event using the captured timestamp gaps so playback runs at the original input speed.
- If Monaco reports an end-of-line change, replay normalizes line endings to the event's `eol` value.

## Current limitations
- History is reset when switching languages.
- The prototype tracks only Monaco model content changes.
- It does not yet persist history, upload chunks, or capture selections/cursors.
