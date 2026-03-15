import dotenv from 'dotenv'
import { createApp } from './app'
import { getDatabaseBackend, getDatabaseInfo } from './adapters/db/client'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 4001

async function startServer() {
  const app = await createApp()
  const dbInfo = getDatabaseInfo()
  
  const server = app.listen(PORT, () => {
    console.log(`🏛 Vienna Runtime Service`)
    console.log(`   Port: ${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   Database Backend: ${dbInfo.backend}${dbInfo.path ? ` (${dbInfo.path})` : ''}`)
    console.log(`   Artifact Backend: ${process.env.ARTIFACT_STORAGE_TYPE || 'filesystem'}`)
    console.log(`   Health: http://localhost:${PORT}/health`)
    console.log(``)
    console.log(`✓ Ready for requests`)
  })
  
  return server
}

// Start server
const serverPromise = startServer()

serverPromise.then((server) => {

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...')
    server.close(() => {
      console.log('Server closed')
      process.exit(0)
    })
  })
}).catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
