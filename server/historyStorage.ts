import Database from 'better-sqlite3'
import type { EditorLanguage } from '../src/features/editor/languages'
import type { RecordedMonacoEvent } from '../src/features/history/types'

type HistorySessionRow = {
  session_id: string
  language: EditorLanguage
}

type HistoryEventRow = {
  payload_json: string
}

export type HistorySessionRecord = {
  sessionId: string
  language: EditorLanguage
  events: RecordedMonacoEvent[]
}

export class HistoryStorage {
  private readonly database: Database.Database

  constructor(filePath: string) {
    this.database = new Database(filePath)
    this.database.pragma('journal_mode = WAL')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS history_sessions (
        session_id TEXT PRIMARY KEY,
        language TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS history_events (
        session_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (session_id, sequence),
        FOREIGN KEY (session_id) REFERENCES history_sessions(session_id)
      );
    `)
  }

  appendSessionEvents(
    sessionId: string,
    language: EditorLanguage,
    events: RecordedMonacoEvent[],
  ) {
    const insertSession = this.database.prepare(`
      INSERT INTO history_sessions (session_id, language)
      VALUES (@sessionId, @language)
      ON CONFLICT(session_id) DO UPDATE SET language = excluded.language
    `)
    const insertEvent = this.database.prepare(`
      INSERT OR IGNORE INTO history_events (session_id, sequence, timestamp, payload_json)
      VALUES (@sessionId, @sequence, @timestamp, @payloadJson)
    `)
    const transaction = this.database.transaction(() => {
      insertSession.run({ sessionId, language })

      for (const event of events) {
        insertEvent.run({
          sessionId,
          sequence: event.sequence,
          timestamp: event.timestamp,
          payloadJson: JSON.stringify(event),
        })
      }
    })

    transaction()

    return this.countSessionEvents(sessionId)
  }

  getSession(sessionId: string): HistorySessionRecord | null {
    const session = this.database
      .prepare('SELECT session_id, language FROM history_sessions WHERE session_id = ?')
      .get(sessionId) as HistorySessionRow | undefined

    if (!session) {
      return null
    }

    const rows = this.database
      .prepare(`
        SELECT payload_json
        FROM history_events
        WHERE session_id = ?
        ORDER BY sequence ASC
      `)
      .all(sessionId) as HistoryEventRow[]

    return {
      sessionId: session.session_id,
      language: session.language,
      events: rows.map((row) => JSON.parse(row.payload_json) as RecordedMonacoEvent),
    }
  }

  close() {
    this.database.close()
  }

  private countSessionEvents(sessionId: string) {
    const result = this.database
      .prepare('SELECT COUNT(*) as total FROM history_events WHERE session_id = ?')
      .get(sessionId) as { total: number }

    return result.total
  }
}
