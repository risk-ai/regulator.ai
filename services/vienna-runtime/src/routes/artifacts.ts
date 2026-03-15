import { Router } from 'express'
import { mockArtifacts } from '../lib/dev-data'
import type { ArtifactListResponse } from '../types/api'

const router = Router()

// GET /api/artifacts - List artifacts
router.get('/', (req, res) => {
  const artifact_type = req.query.artifact_type as string | undefined
  const investigation_id = req.query.investigation_id as string | undefined
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  let filtered = mockArtifacts

  if (artifact_type) {
    filtered = filtered.filter(art => art.artifact_type === artifact_type)
  }

  if (investigation_id) {
    filtered = filtered.filter(art => art.investigation_id === investigation_id)
  }

  const paginated = filtered.slice(offset, offset + limit)

  const response: ArtifactListResponse = {
    artifacts: paginated,
    total: filtered.length,
    limit,
    offset
  }

  res.json(response)
})

// GET /api/artifacts/:id - Get artifact with content
router.get('/:id', (req, res) => {
  const artifact = mockArtifacts.find(art => art.id === req.params.id)

  if (!artifact) {
    return res.status(404).json({
      error: 'artifact_not_found',
      message: `Artifact ${req.params.id} not found`
    })
  }

  // Add mock content for demo
  const withContent = {
    ...artifact,
    content: JSON.stringify({
      intent_id: 'int_20260314_001',
      status: 'completed',
      trace: 'Mock trace data'
    }, null, 2)
  }

  res.json(withContent)
})

export default router
