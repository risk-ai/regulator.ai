/**
 * Status Routes
 * GET /api/v1/status
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

export function createStatusRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/status
   * Top-bar system status snapshot
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const status = await vienna.getSystemStatus();
      
      const response: SuccessResponse = {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATUS_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
