import dotenv from 'dotenv'
import { createApp } from './app'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 4001
const app = createApp()

const server = app.listen(PORT, () => {
  console.log(`🏛 Vienna Runtime Service`)
  console.log(`   Port: ${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   State Backend: ${process.env.VIENNA_STATE_BACKEND || 'memory'}`)
  console.log(`   Artifact Backend: ${process.env.VIENNA_ARTIFACT_BACKEND || 'filesystem'}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(``)
  console.log(`✓ Ready for requests`)
})

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
