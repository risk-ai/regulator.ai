import { Router } from 'express'
import { IncidentRepository } from '../adapters/db/repositories/incidents'
import type { Incident, IncidentListResponse } from '../types/api'

const router = Router()

// Transform DB incident to API incident
function toApiIncident(dbIncident: ReturnType<IncidentRepository['findById']>): Incident | null {
  if (!dbIncident) return null
  
  return {
    id: dbIncident.id,
    title: dbIncident.title,
    severity: dbIncident.severity,
    status: dbIncident.status === 'closed' ? 'resolved' : dbIncident.status as 'open' | 'investigating' | 'resolved',
    service_id: 'unknown', // TODO: Add service_id to incidents table
    detected_by: 'system', // TODO: Add detected_by to incidents table
    detected_at: dbIncident.detected_at,
    resolved_at: dbIncident.resolved_at || undefined,
    resolution_summary: dbIncident.description || undefined
  }
}

// GET /api/incidents - List incidents
router.get('/', (req, res) => {
  const repo = new IncidentRepository()
  const dbIncidents = repo.list()
  const incidents = dbIncidents.map(toApiIncident).filter((i): i is Incident => i !== null)

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
  const dbIncident = repo.findById(req.params.id)

  if (!dbIncident) {
    return res.status(404).json({
      error: 'incident_not_found',
      message: `Incident ${req.params.id} not found`
    })
  }

  const incident = toApiIncident(dbIncident)
  if (!incident) {
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to transform incident'
    })
  }

  res.json(incident)
})

// POST /api/incidents - Create incident
router.post('/', (req, res) => {
  const repo = new IncidentRepository()
  
  const dbIncident = repo.create({
    id: `inc_${Date.now()}`,
    title: req.body.title,
    description: req.body.description,
    severity: req.body.severity || 'medium',
    status: req.body.status || 'open',
    detected_at: new Date().toISOString()
  })

  const incident = toApiIncident(dbIncident)
  if (!incident) {
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to transform incident'
    })
  }

  res.status(201).json(incident)
})

export default router
