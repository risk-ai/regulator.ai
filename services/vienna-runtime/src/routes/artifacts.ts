import { Router } from 'express'
import { ArtifactRepository } from '../adapters/db/repositories/artifacts'

const router = Router()

// GET /api/artifacts - List artifacts
router.get('/', (req, res) => {
  const repo = new ArtifactRepository()
  const artifacts = repo.list()

  res.json({
    artifacts,
    total: artifacts.length
  })
})

// GET /api/artifacts/:id - Get artifact details
router.get('/:id', (req, res) => {
  const repo = new ArtifactRepository()
  const artifact = repo.findById(req.params.id)

  if (!artifact) {
    return res.status(404).json({
      error: 'artifact_not_found',
      message: `Artifact ${req.params.id} not found`
    })
  }

  res.json(artifact)
})

export default router
