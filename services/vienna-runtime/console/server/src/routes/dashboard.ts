/**
 * Dashboard Routes
 * GET /api/v1/dashboard
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type { SuccessResponse, ErrorResponse, DashboardBootstrapResponse } from '../types/api.js';

export function createDashboardRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * GET /api/v1/dashboard
   * Bootstrap entire dashboard state in one request
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const dashboard = await vienna.bootstrapDashboard();
      
      const response: SuccessResponse<DashboardBootstrapResponse> = {
        success: true,
        data: dashboard as DashboardBootstrapResponse,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DASHBOARD_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
