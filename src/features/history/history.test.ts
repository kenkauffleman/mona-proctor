import { describe, expect, it } from 'vitest'
import {
  applyRecordedMonacoEvent,
  buildRecordedMonacoPlaybackSteps,
  createRecordedMonacoEvent,
  replayRecordedMonacoEvents,
} from './history'
import type { MonacoContentChangeEvent } from './types'

function createContentChangeEvent(
  overrides: Partial<MonacoContentChangeEvent> = {},
): MonacoContentChangeEvent {
  return {
    changes: [],
    eol: '\n',
    versionId: 1,
    isUndoing: false,
    isRedoing: false,
    isFlush: false,
    isEolChange: false,
    detailedReasonsChangeLengths: [],
    ...overrides,
  }
}

describe('createRecordedMonacoEvent', () => {
  it('captures the expected event shape from a Monaco content-change event', () => {
    const event = createContentChangeEvent({
      versionId: 4,
      isUndoing: true,
      changes: [
        {
          range: {
            startLineNumber: 1,
            startColumn: 6,
            endLineNumber: 1,
            endColumn: 6,
          },
          rangeOffset: 5,
          rangeLength: 0,
          text: ' world',
        },
      ],
    })

    expect(createRecordedMonacoEvent(event, 3, 1700000000000)).toEqual({
      sequence: 3,
      timestamp: 1700000000000,
      versionId: 4,
      isUndoing: true,
      isRedoing: false,
      isFlush: false,
      isEolChange: false,
      eol: '\n',
      changes: [
        {
          rangeOffset: 5,
          rangeLength: 0,
          text: ' world',
          range: {
            startLineNumber: 1,
            startColumn: 6,
            endLineNumber: 1,
            endColumn: 6,
          },
        },
      ],
    })
  })
})

describe('applyRecordedMonacoEvent', () => {
  it('applies Monaco changes in event order', () => {
    const event = createRecordedMonacoEvent(
      createContentChangeEvent({
        changes: [
          {
            range: {
              startLineNumber: 1,
              startColumn: 6,
              endLineNumber: 1,
              endColumn: 6,
            },
            rangeOffset: 5,
            rangeLength: 0,
            text: '!',
          },
          {
            range: {
              startLineNumber: 1,
              startColumn: 3,
              endLineNumber: 1,
              endColumn: 6,
            },
            rangeOffset: 2,
            rangeLength: 3,
            text: 'llo',
          },
        ],
      }),
      1,
      1,
    )

    expect(applyRecordedMonacoEvent('heyou', event)).toBe('hello!')
  })

  it('normalizes line endings when Monaco reports an eol change', () => {
    const event = createRecordedMonacoEvent(
      createContentChangeEvent({
        eol: '\r\n',
        isEolChange: true,
      }),
      1,
      1,
    )

    expect(applyRecordedMonacoEvent('a\nb\nc', event)).toBe('a\r\nb\r\nc')
  })
})

describe('replayRecordedMonacoEvents', () => {
  it('reconstructs final editor contents from recorded events alone', () => {
    const events = [
      createRecordedMonacoEvent(
        createContentChangeEvent({
          versionId: 2,
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 6,
                endLineNumber: 1,
                endColumn: 6,
              },
              rangeOffset: 5,
              rangeLength: 0,
              text: ' world',
            },
          ],
        }),
        1,
        100,
      ),
      createRecordedMonacoEvent(
        createContentChangeEvent({
          versionId: 3,
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 12,
                endLineNumber: 1,
                endColumn: 12,
              },
              rangeOffset: 11,
              rangeLength: 0,
              text: '!',
            },
          ],
        }),
        2,
        200,
      ),
      createRecordedMonacoEvent(
        createContentChangeEvent({
          versionId: 4,
          isUndoing: true,
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 12,
                endLineNumber: 1,
                endColumn: 13,
              },
              rangeOffset: 11,
              rangeLength: 1,
              text: '',
            },
          ],
        }),
        3,
        300,
      ),
      createRecordedMonacoEvent(
        createContentChangeEvent({
          versionId: 5,
          isRedoing: true,
          changes: [
            {
              range: {
                startLineNumber: 1,
                startColumn: 12,
                endLineNumber: 1,
                endColumn: 12,
              },
              rangeOffset: 11,
              rangeLength: 0,
              text: '!',
            },
          ],
        }),
        4,
        400,
      ),
    ]

    expect(replayRecordedMonacoEvents('hello', events)).toBe('hello world!')
    expect(events[2]?.isUndoing).toBe(true)
    expect(events[3]?.isRedoing).toBe(true)
  })

  it('replays by sequence number even if events are stored out of order', () => {
    const insertB = createRecordedMonacoEvent(
      createContentChangeEvent({
        changes: [
          {
            range: {
              startLineNumber: 1,
              startColumn: 2,
              endLineNumber: 1,
              endColumn: 2,
            },
            rangeOffset: 1,
            rangeLength: 0,
            text: 'b',
          },
        ],
      }),
      2,
      200,
    )

    const insertA = createRecordedMonacoEvent(
      createContentChangeEvent({
        changes: [
          {
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
            },
            rangeOffset: 0,
            rangeLength: 0,
            text: 'a',
          },
        ],
      }),
      1,
      100,
    )

    expect(replayRecordedMonacoEvents('', [insertB, insertA])).toBe('ab')
  })
})

describe('buildRecordedMonacoPlaybackSteps', () => {
  it('creates timing steps that preserve the original spacing between events', () => {
    const events = [
      createRecordedMonacoEvent(createContentChangeEvent(), 2, 1450),
      createRecordedMonacoEvent(createContentChangeEvent(), 1, 1000),
      createRecordedMonacoEvent(createContentChangeEvent(), 3, 1700),
    ]

    expect(buildRecordedMonacoPlaybackSteps(events)).toEqual([
      {
        event: events[1],
        delayMs: 0,
        elapsedMs: 0,
      },
      {
        event: events[0],
        delayMs: 450,
        elapsedMs: 450,
      },
      {
        event: events[2],
        delayMs: 250,
        elapsedMs: 700,
      },
    ])
  })
})
