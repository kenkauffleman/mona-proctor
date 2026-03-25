import { createBackendApp } from './app.js'
import { getBackendConfig } from './config.js'
import { FirestoreValidationStore } from './firestoreValidationStore.js'

const config = getBackendConfig()
const validationStore = new FirestoreValidationStore(config.projectId)
const app = createBackendApp(validationStore, config)

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Backend validation service listening on http://0.0.0.0:${config.port}`)
})

function shutdown() {
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
