import { Router } from 'express'
import type { HealthResponse } from '../types/api'
import { getDatabaseBackend, getDatabaseInfo, checkDatabaseHealth } from '../adapters/db/client'

const router = Router()

const startTime = Date.now()

router.get('/', async (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000)
  const dbInfo = getDatabaseInfo()
  const dbHealthy = await checkDatabaseHealth()

  const health: HealthResponse = {
    status: dbHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptime_seconds: uptime,
    components: {
      state_graph: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        type: dbInfo.backend,
        configured: dbInfo.configured,
        path: dbInfo.path
      },
      artifact_storage: {
        status: 'healthy',
        disk_usage: 'N/A (dev mode)'
      }
    }
  }

  res.json(health)
})

export default router
