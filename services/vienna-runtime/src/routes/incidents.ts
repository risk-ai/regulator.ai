import { Router } from 'express'
import { mockIncidents } from '../lib/dev-data'
import type { IncidentListResponse } from '../types/api'

const router = Router()

// GET /api/incidents - List incidents
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined
  const severity = req.query.severity as string | undefined
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  let filtered = mockIncidents

  if (status) {
    filtered = filtered.filter(inc => inc.status === status)
  }

  if (severity) {
    filtered = filtered.filter(inc => inc.severity === severity)
  }

  const paginated = filtered.slice(offset, offset + limit)

  const response: IncidentListResponse = {
    incidents: paginated,
    total: filtered.length,
    limit,
    offset
  }

  res.json(response)
})

// GET /api/incidents/:id - Get incident details
router.get('/:id', (req, res) => {
  const incident = mockIncidents.find(inc => inc.id === req.params.id)

  if (!incident) {
    return res.status(404).json({
      error: 'incident_not_found',
      message: `Incident ${req.params.id} not found`
    })
  }

  res.json(incident)
})

// POST /api/incidents - Create incident (stub)
router.post('/', (req, res) => {
  // For now, just echo back what was sent
  res.status(201).json({
    id: `inc_${Date.now()}`,
    ...req.body,
    detected_at: new Date().toISOString()
  })
})

export default router
