/**
 * Intent Routes
 * 
 * Phase 11: Canonical action ingress for Vienna OS
 * All operator actions should route through Intent Gateway
 * 
 * Enhanced: Dynamic action type lookup from action_types table.
 * Unknown action types are rejected; disabled ones return 403.
 */

import { Router, Request, Response } from 'express';
import { IntentGateway, getStateGraph } from '@vienna/lib';
import { queryOne, execute } from '../db/postgres.js';
import { metrics } from '../services/metricsService.js';

export function createIntentRouter(): Router {
  const router = Router();
  const stateGraph = getStateGraph();
  const intentGateway = new IntentGateway(stateGraph, {
    supported_intent_types: [
      'restore_objective',
      'investigate_objective',
      'set_safe_mode',
      'test_execution'  // Phase 1 validation support
    ]
  });

  /**
   * POST /api/v1/intent
   * Submit intent to Vienna OS
   * 
   * Phase 21-30: Enhanced with tenant/quota/cost/attestation/explanation
   * Custom Action Types: Validates intent_type against action_types registry
   * 
   * Body:
   * {
   *   intent_type: string,
   *   payload: { ... },
   *   simulation?: boolean  // Phase 24: Dry run mode
   * }
   */
  router.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
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

      // ── Custom Action Type Lookup ──────────────────────────────────────
      // Check if the intent_type is a registered action type
      let actionType: any = null;
      let defaultRiskTier: string | undefined;

      try {
        actionType = await queryOne(
          'SELECT id, action_type, display_name, default_risk_tier, enabled FROM action_types WHERE action_type = $1',
          [intent_type]
        );
      } catch (dbError) {
        // If DB table doesn't exist yet (migration not run), fall through to gateway
        console.warn('[IntentRoute] action_types lookup failed (table may not exist):', dbError);
      }

      if (actionType) {
        // Action type found in registry
        if (!actionType.enabled) {
          return res.status(403).json({
            success: false,
            error: `Action type "${intent_type}" is currently disabled`,
            code: 'ACTION_TYPE_DISABLED',
            data: {
              action_type: intent_type,
              display_name: actionType.display_name,
            },
            timestamp: new Date().toISOString(),
          });
        }

        defaultRiskTier = actionType.default_risk_tier;

        // Log usage as 'submitted'
        try {
          await execute(
            `INSERT INTO action_type_usage (action_type_id, agent_id, intent_id, status)
             VALUES ($1, $2, $3, 'submitted')`,
            [actionType.id, operator_id, null]
          );
        } catch (usageError) {
          console.warn('[IntentRoute] Failed to log action type usage:', usageError);
        }
      } else {
        // Not found in action_types table — check if it's a legacy supported type
        const legacyTypes = ['restore_objective', 'investigate_objective', 'set_safe_mode', 'test_execution'];
        if (!legacyTypes.includes(intent_type)) {
          return res.status(404).json({
            success: false,
            error: `Unknown action type: "${intent_type}". Register it first via POST /api/v1/action-types`,
            code: 'ACTION_TYPE_NOT_FOUND',
            data: {
              intent_type,
              hint: 'Use GET /api/v1/action-types to see all registered action types',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Build intent with operator source
      // FIX #1: Mark DB-validated custom types so IntentGateway allows them through
      const intent: Record<string, any> = {
        intent_type,
        source: {
          type: 'operator',
          id: operator_id,
        },
        payload,
        _dbValidated: !!actionType, // true if found in action_types registry
      };

      // Phase 21-30: Submit with governance context
      const context: Record<string, any> = {
        tenant_id,
        session: (req as any).session,
        simulation,
      };

      // Pass default risk tier from action type registry if available
      if (defaultRiskTier) {
        context.default_risk_tier = defaultRiskTier;
      }

      const response = await intentGateway.submitIntent(intent, context);

      // Record metrics
      const processingTime = (Date.now() - startTime) / 1000;
      const riskTier = defaultRiskTier || context.risk_tier || 'T0';
      
      metrics.recordIntentSubmission(riskTier, intent_type, tenant_id);
      metrics.observeIntentProcessingTime(processingTime, riskTier, intent_type);
      
      if (response.accepted) {
        metrics.recordIntentApproval(riskTier, intent_type);
      } else {
        metrics.recordIntentDenial(riskTier, response.reason || 'unknown');
      }

      // Update usage status based on result
      if (actionType) {
        try {
          const status = response.accepted ? 'approved' : 'denied';
          await execute(
            `UPDATE action_type_usage
             SET status = $1, intent_id = $2
             WHERE action_type_id = $3
             AND status = 'submitted'
             AND agent_id = $4
             ORDER BY executed_at DESC
             LIMIT 1`,
            [status, response.intent_id || null, actionType.id, operator_id]
          );
        } catch (updateError) {
          console.warn('[IntentRoute] Failed to update usage status:', updateError);
        }
      }

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
            risk_tier: defaultRiskTier,                 // From action type registry
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
            risk_tier: defaultRiskTier,
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
