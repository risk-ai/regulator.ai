import { Router } from 'express'
import type { HealthResponse } from '../types/api'

const router = Router()

const startTime = Date.now()

router.get('/', (_req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  const health: HealthResponse = {
    status: 'healthy',
    version: '1.0.0',
    uptime_seconds: uptime,
    components: {
      state_graph: {
        status: 'healthy',
        type: (process.env.VIENNA_STATE_BACKEND as 'memory' | 'sqlite' | 'postgres') || 'memory'
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
