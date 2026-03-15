import { Router } from 'express'
import { InvestigationRepository } from '../adapters/db/repositories/investigations'
import { ArtifactRepository } from '../adapters/db/repositories/artifacts'
import type { InvestigationListResponse } from '../types/api'

const router = Router()

// GET /api/investigations - List investigations
router.get('/', (req, res) => {
  const repo = new InvestigationRepository()
  const status = req.query.status as string | undefined
  const limit = parseInt(req.query.limit as string) || 50

  const investigations = repo.list({ status, limit })

  const response: InvestigationListResponse = {
    investigations,
    total: investigations.length,
    limit,
    offset: 0
  }

  res.json(response)
})

// GET /api/investigations/:id - Get investigation details
router.get('/:id', (req, res) => {
  const repo = new InvestigationRepository()
  const artifactRepo = new ArtifactRepository()
  
  const investigation = repo.findById(req.params.id)

  if (!investigation) {
    return res.status(404).json({
      error: 'investigation_not_found',
      message: `Investigation ${req.params.id} not found`
    })
  }

  // Expand with artifacts
  const artifacts = artifactRepo.listByInvestigation(investigation.id)
  const incidents = repo.getLinkedIncidents(investigation.id)

  res.json({
    ...investigation,
    artifacts,
    incidents
  })
})

export default router
