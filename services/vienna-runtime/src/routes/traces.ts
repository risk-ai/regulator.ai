import { Router } from 'express'
import { mockTraceTimeline } from '../lib/dev-data'

const router = Router()

// GET /api/traces/:id - Get trace (stub)
router.get('/:id', (req, res) => {
  res.json({
    intent_id: req.params.id,
    status: 'completed',
    created_at: '2026-03-14T21:18:00Z'
  })
})

// GET /api/traces/:id/timeline - Get trace timeline
router.get('/:id/timeline', (req, res) => {
  // Return mock timeline
  res.json({
    ...mockTraceTimeline,
    intent_id: req.params.id
  })
})

export default router
