import express, { Express } from 'express'
import cors from 'cors'
import { initializeDatabase } from './adapters/db/client'
import { bootstrap } from './lib/bootstrap'
import healthRouter from './routes/health'
import investigationsRouter from './routes/investigations'
import incidentsRouter from './routes/incidents'
import artifactsRouter from './routes/artifacts'
import tracesRouter from './routes/traces'

export async function createApp(): Promise<Express> {
  // Initialize database and seed data
  await initializeDatabase()
  bootstrap()
  
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }))

  // Request logging
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
  })

  // Routes
  app.use('/health', healthRouter)
  app.use('/api/investigations', investigationsRouter)
  app.use('/api/incidents', incidentsRouter)
  app.use('/api/artifacts', artifactsRouter)
  app.use('/api/traces', tracesRouter)

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'Endpoint not found'
    })
  })

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err)
    res.status(500).json({
      error: 'internal_error',
      message: err.message
    })
  })

  return app
}
