/**
 * Intent Routes
 * 
 * Phase 11: Canonical action ingress for Vienna OS
 * All operator actions should route through Intent Gateway
 */

import { Router, Request, Response } from 'express';
import { IntentGateway } from '../../../../lib/core/intent-gateway.js';
import { getStateGraph } from '../../../../lib/state/state-graph.js';

export function createIntentRouter(): Router {
  const router = Router();
  const stateGraph = getStateGraph();
  const intentGateway = new IntentGateway(stateGraph);

  /**
   * POST /api/v1/intent
   * Submit intent to Vienna OS
   * 
   * Body:
   * {
   *   intent_type: 'restore_objective' | 'investigate_objective' | 'set_safe_mode',
   *   payload: { ... }
   * }
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { intent_type, payload } = req.body;

      if (!intent_type || !payload) {
        return res.status(400).json({
          success: false,
          error: 'intent_type and payload required',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
      }

      // Build intent with operator source
      const intent = {
        intent_type,
        source: {
          type: 'operator',
          id: 'console', // In future: extract from auth session
        },
        payload,
      };

      // Submit to Intent Gateway
      const response = await intentGateway.submitIntent(intent);

      // Map to API response
      if (response.accepted) {
        res.json({
          success: true,
          data: {
            intent_id: response.intent_id,
            action: response.action,
            message: response.message,
            metadata: response.metadata,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          success: false,
          error: response.error,
          code: 'INTENT_REJECTED',
          data: {
            intent_id: response.intent_id,
            metadata: response.metadata,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[IntentRoute] Error processing intent:', error);

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
