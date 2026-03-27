import { FirebaseAdminAuthVerifier } from './auth.js'
import { createBackendApp } from './app.js'
import { getBackendConfig } from './config.js'
import { FirestoreHistoryRepository } from './firestoreHistoryRepository.js'

const config = getBackendConfig()
const historyRepository = new FirestoreHistoryRepository(config.projectId)
const authVerifier = new FirebaseAdminAuthVerifier(config.projectId)
const app = createBackendApp(historyRepository, authVerifier, config)

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Backend history service listening on http://0.0.0.0:${config.port}`)
})

function shutdown() {
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
