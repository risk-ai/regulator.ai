/**
 * Decisions Routes
 * GET /api/v1/decisions
 * 
 * Operator inbox - aggregated decision items requiring attention
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { SuccessResponse, ErrorResponse, DecisionItem } from '../types/api.js';

export function createDecisionsRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/decisions
   * Get all items requiring operator decision
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const decisions = await vienna.getDecisions();
      
      const response: SuccessResponse<DecisionItem[]> = {
        success: true,
        data: decisions,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DECISIONS_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
