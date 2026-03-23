/**
 * System Routes
 * Phase 5E: Operator "Now" View
 * 
 * Unified system observability endpoints.
 */

import { Router, Request, Response } from 'express';
import type { SystemNowService } from '../services/systemNowService.js';
import type { SystemNowResponse } from '../types/systemNow.js';

export function createSystemRouter(
  systemNowService?: SystemNowService
): Router {
  const router = Router();

  /**
   * GET /api/v1/system/now
   * Unified operator "now" view - what's happening right now?
   * Phase 5E capstone endpoint
   */
  router.get('/now', async (req: Request, res: Response) => {
    try {
      if (!systemNowService) {
        res.status(503).json({
          success: false,
          error: 'System "now" service not available',
          code: 'SERVICE_UNAVAILABLE',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const snapshot = await systemNowService.getSystemNow();

      const response: SystemNowResponse = {
        success: true,
        data: snapshot,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('[SystemRouter] Error getting system now:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SYSTEM_NOW_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
