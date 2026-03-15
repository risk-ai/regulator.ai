import { Router } from 'express'
import { InvestigationRepository } from '../adapters/db/repositories/investigations'
import { ArtifactRepository } from '../adapters/db/repositories/artifacts'
import type { Investigation, InvestigationListResponse } from '../types/api'

const router = Router()

// Transform DB investigation to API investigation
function toApiInvestigation(dbInv: ReturnType<InvestigationRepository['findById']>): Investigation | null {
  if (!dbInv) return null
  
  return {
    id: dbInv.id,
    name: dbInv.name,
    description: dbInv.description || undefined,
    status: dbInv.status,
    objective_id: undefined, // TODO: Add objective_id to investigations table
    created_by: dbInv.created_by,
    created_at: dbInv.created_at,
    resolved_at: dbInv.resolved_at || undefined,
    workspace_path: `/workspace/investigations/${dbInv.id}`, // Derived field
    artifact_count: 0, // TODO: Add aggregation
    trace_count: 0 // TODO: Add aggregation
  }
}

// GET /api/investigations - List investigations
router.get('/', (req, res) => {
  const repo = new InvestigationRepository()
  const status = req.query.status as string | undefined
  const limit = parseInt(req.query.limit as string) || 50

  const dbInvestigations = repo.list({ status, limit })
  const investigations = dbInvestigations.map(toApiInvestigation).filter((i): i is Investigation => i !== null)

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
  
  const dbInvestigation = repo.findById(req.params.id)

  if (!dbInvestigation) {
    return res.status(404).json({
      error: 'investigation_not_found',
      message: `Investigation ${req.params.id} not found`
    })
  }

  const investigation = toApiInvestigation(dbInvestigation)
  if (!investigation) {
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to transform investigation'
    })
  }

  // Expand with artifacts
  const artifacts = artifactRepo.listByInvestigation(investigation.id)
  const incidents = repo.getLinkedIncidents(investigation.id)

  res.json({
    ...investigation,
    artifact_count: artifacts.length,
    trace_count: 0, // TODO
    artifacts,
    incidents
  })
})

export default router
