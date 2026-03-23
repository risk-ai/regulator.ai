/**
 * Directives Routes
 * POST /api/v1/directives
 * 
 * Operator command submission via Vienna
 */

import { Router, Request, Response } from 'express';
import { ViennaRuntimeService } from '../services/viennaRuntime.js';
import type {
  SuccessResponse,
  ErrorResponse,
  SubmitDirectiveRequest,
  SubmitDirectiveResponse,
} from '../types/api.js';

export function createDirectivesRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * POST /api/v1/directives
   * Submit directive to Vienna
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const request: SubmitDirectiveRequest = req.body;
      
      if (!request.operator || !request.text || !request.risk_tier) {
        const err: ErrorResponse = {
          success: false,
          error: 'Missing required fields: operator, text, risk_tier',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      // Validate risk tier
      if (!['T0', 'T1', 'T2'].includes(request.risk_tier)) {
        const err: ErrorResponse = {
          success: false,
          error: 'Invalid risk_tier: must be T0, T1, or T2',
          code: 'INVALID_RISK_TIER',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }
      
      const result = await vienna.submitDirective(request);
      
      const responseData: SubmitDirectiveResponse = {
        success: true,
        directive_id: result.directive_id,
        objective_id: result.objective_id,
        created_at: result.created_at,
      };
      
      const response: SuccessResponse<SubmitDirectiveResponse> = {
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      };
      
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DIRECTIVE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
