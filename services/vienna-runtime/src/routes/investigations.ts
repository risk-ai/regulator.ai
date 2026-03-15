import { Router } from 'express'
import { mockInvestigations } from '../lib/dev-data'
import type { InvestigationListResponse, Investigation } from '../types/api'

const router = Router()

// GET /api/investigations - List investigations
router.get('/', (req, res) => {
  const status = req.query.status as string | undefined
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  let filtered = mockInvestigations

  if (status) {
    filtered = filtered.filter(inv => inv.status === status)
  }

  const paginated = filtered.slice(offset, offset + limit)

  const response: InvestigationListResponse = {
    investigations: paginated,
    total: filtered.length,
    limit,
    offset
  }

  res.json(response)
})

// GET /api/investigations/:id - Get investigation details
router.get('/:id', (req, res) => {
  const investigation = mockInvestigations.find(inv => inv.id === req.params.id)

  if (!investigation) {
    return res.status(404).json({
      error: 'investigation_not_found',
      message: `Investigation ${req.params.id} not found`
    })
  }

  res.json(investigation)
})

export default router
