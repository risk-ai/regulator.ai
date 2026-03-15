import { Router } from 'express'
import { TraceRepository } from '../adapters/db/repositories/traces'

const router = Router()

// GET /api/traces/:id - Get trace details
router.get('/:id', (req, res) => {
  const repo = new TraceRepository()
  const trace = repo.findById(req.params.id)

  if (!trace) {
    return res.status(404).json({
      error: 'trace_not_found',
      message: `Trace ${req.params.id} not found`
    })
  }

  res.json(trace)
})

// GET /api/traces/:id/timeline - Get trace timeline
router.get('/:id/timeline', (req, res) => {
  const repo = new TraceRepository()
  const timeline = repo.getTimeline(req.params.id)

  res.json({
    trace_id: req.params.id,
    timeline,
    count: timeline.length
  })
})

export default router
