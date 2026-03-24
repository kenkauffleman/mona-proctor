import fs from 'node:fs'
import path from 'node:path'
import { createHistoryApi } from './historyApi'
import { HistoryStorage } from './historyStorage'

const port = Number(process.env.PORT ?? 3001)
const dataDirectory = path.resolve(process.cwd(), 'data')
const databasePath = path.join(dataDirectory, 'history.db')

fs.mkdirSync(dataDirectory, { recursive: true })

const storage = new HistoryStorage(databasePath)
const app = createHistoryApi(storage)

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`History API listening on http://0.0.0.0:${port}`)
})

function shutdown() {
  server.close(() => {
    storage.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
