import process from 'node:process'

async function main() {
  const baseUrl = process.env.BACKEND_BASE_URL ?? 'http://127.0.0.1:8081'
  const sessionId = process.env.HISTORY_SESSION_ID ?? `manual-${Date.now()}`

  const appendResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}/batches`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: 'python',
      batchSequence: 1,
      eventOffset: 0,
      events: [{
        sequence: 1,
        timestamp: Date.now(),
        versionId: 1,
        isUndoing: false,
        isRedoing: false,
        isFlush: false,
        isEolChange: false,
        eol: '\n',
        changes: [{
          range: {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          },
          rangeOffset: 0,
          rangeLength: 0,
          text: 'manual smoke test',
        }],
      }],
    }),
  })

  if (!appendResponse.ok) {
    throw new Error(`Append request failed with ${appendResponse.status}: ${await appendResponse.text()}`)
  }

  const sessionResponse = await fetch(`${baseUrl}/api/history/sessions/${sessionId}`)

  if (!sessionResponse.ok) {
    throw new Error(`Session load failed with ${sessionResponse.status}: ${await sessionResponse.text()}`)
  }

  console.log(JSON.stringify({
    append: await appendResponse.json(),
    session: await sessionResponse.json(),
  }, null, 2))
}

main().catch((error: unknown) => {
  console.error('History API exercise failed.')
  console.error(error)
  process.exit(1)
})
