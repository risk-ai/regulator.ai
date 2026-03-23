/**
 * Intent Routes
 * 
 * Phase 11: Canonical action ingress for Vienna OS
 * All operator actions should route through Intent Gateway
 */

import { Router, Request, Response } from 'express';
import { IntentGateway, getStateGraph } from '@vienna/lib';

export function createIntentRouter(): Router {
  const router = Router();
  const stateGraph = getStateGraph();
  const intentGateway = new IntentGateway(stateGraph);

  /**
   * POST /api/v1/intent
   * Submit intent to Vienna OS
   * 
   * Phase 21-30: Enhanced with tenant/quota/cost/attestation/explanation
   * 
   * Body:
   * {
   *   intent_type: 'restore_objective' | 'investigate_objective' | 'set_safe_mode',
   *   payload: { ... },
   *   simulation?: boolean  // Phase 24: Dry run mode
   * }
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { intent_type, payload, simulation = false } = req.body;

      if (!intent_type || !payload) {
        return res.status(400).json({
          success: false,
          error: 'intent_type and payload required',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
      }

      // Phase 21: Extract tenant from session
      const tenant_id = (req as any).session?.tenant_id || 'system';
      const operator_id = (req as any).session?.operator?.id || 'console';

      // Build intent with operator source
      const intent = {
        intent_type,
        source: {
          type: 'operator',
          id: operator_id,
        },
        payload,
      };

      // Phase 21-30: Submit with governance context
      const context = {
        tenant_id,
        session: (req as any).session,
        simulation,
      };

      const response = await intentGateway.submitIntent(intent, context);

      // Enhanced API response with Phase 21-30 fields
      if (response.accepted) {
        res.json({
          success: true,
          data: {
            intent_id: response.intent_id,
            tenant_id: response.tenant_id,
            action: response.action,
            execution_id: response.execution_id,
            simulation: response.simulation,
            explanation: response.explanation,          // Phase 27
            attestation: response.attestation,          // Phase 23
            cost: response.cost,                        // Phase 29
            quota_state: response.quota_state,          // Phase 22
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
            tenant_id: response.tenant_id,
            explanation: response.explanation,          // Phase 27
            quota_state: response.quota_state,          // Phase 22
            cost: response.cost,                        // Phase 29
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
