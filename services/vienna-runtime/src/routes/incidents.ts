import { Router } from 'express'
import { IncidentRepository } from '../adapters/db/repositories/incidents'
import type { IncidentListResponse } from '../types/api'

const router = Router()

// GET /api/incidents - List incidents
router.get('/', (req, res) => {
  const repo = new IncidentRepository()
  const incidents = repo.list()

  const response: IncidentListResponse = {
    incidents,
    total: incidents.length,
    limit: 50,
    offset: 0
  }

  res.json(response)
})

// GET /api/incidents/:id - Get incident details
router.get('/:id', (req, res) => {
  const repo = new IncidentRepository()
  const incident = repo.findById(req.params.id)

  if (!incident) {
    return res.status(404).json({
      error: 'incident_not_found',
      message: `Incident ${req.params.id} not found`
    })
  }

  res.json(incident)
})

// POST /api/incidents - Create incident
router.post('/', (req, res) => {
  const repo = new IncidentRepository()
  
  const newIncident = repo.create({
    id: `inc_${Date.now()}`,
    title: req.body.title,
    description: req.body.description,
    severity: req.body.severity || 'medium',
    status: req.body.status || 'open',
    detected_at: new Date().toISOString()
  })

  res.status(201).json(newIncident)
})

export default router
