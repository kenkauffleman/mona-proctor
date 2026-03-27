import { FirebaseAdminAuthVerifier } from './auth.js'
import { createBackendApp } from './app.js'
import { getBackendConfig } from './config.js'
import { createExecutionBackend } from './executionBackendFactory.js'
import { ExecutionService } from './executionService.js'
import { FirestoreExecutionRepository } from './firestoreExecutionRepository.js'
import { FirestoreHistoryRepository } from './firestoreHistoryRepository.js'

const config = getBackendConfig()
const historyRepository = new FirestoreHistoryRepository(config.projectId)
const executionRepository = new FirestoreExecutionRepository(config.projectId)
const authVerifier = new FirebaseAdminAuthVerifier(config.projectId)
const executionBackend = createExecutionBackend(config)
const executionService = new ExecutionService(executionRepository, executionBackend, {
  maxSourceBytes: config.executionMaxSourceBytes,
  timeoutMs: config.executionTimeoutMs,
  maxStdoutBytes: config.executionMaxStdoutBytes,
  maxStderrBytes: config.executionMaxStderrBytes,
  globalActiveJobLimit: config.executionGlobalActiveJobLimit,
})
const app = createBackendApp(historyRepository, authVerifier, executionService, config)

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
