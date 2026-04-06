/**
 * Policy Simulation API Routes — Vienna OS
 * 
 * Simulate policy changes against historical data before deploying.
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/postgres.js';

export function createPolicySimulationRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/simulate/policy
   * 
   * Simulate proposed policies against historical intents.
   * 
   * Body:
   * {
   *   proposed_policies: SimulationPolicy[],
   *   time_window_hours?: number (default 168 = 7 days),
   *   max_intents?: number (default 1000)
   * }
   */
  router.post('/policy', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { 
        proposed_policies, 
        time_window_hours = 168, 
        max_intents = 1000 
      } = req.body;

      if (!proposed_policies || !Array.isArray(proposed_policies)) {
        return res.status(400).json({
          success: false,
          error: 'proposed_policies array is required',
        });
      }

      // Load historical intents from audit log
      const cutoff = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();

      const auditRows = await query<{
        event: string;
        details: any;
        risk_tier: number;
        created_at: string;
      }>(
        `SELECT event, details, risk_tier, created_at
         FROM audit_log
         WHERE tenant_id = $1
           AND event IN ('intent.submitted', 'intent.approved', 'intent.denied')
           AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [tenantId, cutoff, max_intents * 3] // 3x because we need to correlate submit/approve/deny
      );

      // Correlate: for each intent_id, determine the final decision
      const intentMap = new Map<string, {
        intent_id: string;
        agent_id: string;
        action: string;
        risk_tier: string;
        actual_decision: string;
        actual_approval_required: boolean;
        timestamp: string;
        details: any;
      }>();

      for (const row of auditRows) {
        const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        const intentId = details.intent_id;
        if (!intentId) continue;

        const existing = intentMap.get(intentId);

        if (row.event === 'intent.submitted' || row.event.includes('submitted')) {
          if (!existing) {
            intentMap.set(intentId, {
              intent_id: intentId,
              agent_id: details.agent_id || 'unknown',
              action: details.action || 'unknown',
              risk_tier: details.risk_tier || `T${row.risk_tier || 0}`,
              actual_decision: 'pending',
              actual_approval_required: false,
              timestamp: row.created_at,
              details,
            });
          }
        } else if (row.event === 'intent.approved' || row.event.includes('approved')) {
          const entry = existing || {
            intent_id: intentId,
            agent_id: details.agent_id || 'unknown',
            action: details.action || 'unknown',
            risk_tier: details.risk_tier || `T${row.risk_tier || 0}`,
            actual_decision: 'approved',
            actual_approval_required: !!details.approved_by,
            timestamp: row.created_at,
            details,
          };
          entry.actual_decision = 'approved';
          entry.actual_approval_required = !!details.approved_by && details.approved_by !== 'system_auto';
          intentMap.set(intentId, entry);
        } else if (row.event === 'intent.denied' || row.event.includes('denied')) {
          const entry = existing || {
            intent_id: intentId,
            agent_id: details.agent_id || 'unknown',
            action: details.action || 'unknown',
            risk_tier: details.risk_tier || `T${row.risk_tier || 0}`,
            actual_decision: 'denied',
            actual_approval_required: false,
            timestamp: row.created_at,
            details,
          };
          entry.actual_decision = 'denied';
          intentMap.set(intentId, entry);
        }
      }

      const intents = Array.from(intentMap.values()).slice(0, max_intents);

      // Run simulation
      const { PolicySimulator } = await import(
        '../../../../services/vienna-lib/governance/policy-simulator.js'
      );
      const simulator = new PolicySimulator();
      const result = simulator.simulate({
        intents: intents as any,
        proposedPolicies: proposed_policies,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[PolicySimulation] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/v1/simulate/compare
   * 
   * Compare two policy sets against historical data.
   * Shows the diff between current policies and proposed changes.
   */
  router.post('/compare', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { current_policies, proposed_policies, time_window_hours = 168 } = req.body;

      if (!current_policies || !proposed_policies) {
        return res.status(400).json({
          success: false,
          error: 'Both current_policies and proposed_policies are required',
        });
      }

      // Load historical intents (same as above)
      const cutoff = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();
      const auditRows = await query<any>(
        `SELECT event, details, risk_tier, created_at
         FROM audit_log
         WHERE tenant_id = $1
           AND event IN ('intent.submitted', 'intent.approved', 'intent.denied')
           AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT 3000`,
        [tenantId, cutoff]
      );

      // Build intent list (same correlation logic)
      const intentMap = new Map();
      for (const row of auditRows) {
        const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        const intentId = details.intent_id;
        if (!intentId) continue;
        const existing = intentMap.get(intentId);
        if (!existing) {
          intentMap.set(intentId, {
            intent_id: intentId,
            agent_id: details.agent_id || 'unknown',
            action: details.action || 'unknown',
            risk_tier: details.risk_tier || 'T0',
            actual_decision: row.event.includes('approved') ? 'approved' : row.event.includes('denied') ? 'denied' : 'pending',
            actual_approval_required: false,
            timestamp: row.created_at,
            details,
          });
        } else if (row.event.includes('approved')) {
          existing.actual_decision = 'approved';
        } else if (row.event.includes('denied')) {
          existing.actual_decision = 'denied';
        }
      }

      const intents = Array.from(intentMap.values()).slice(0, 1000);

      const { PolicySimulator } = await import(
        '../../../../services/vienna-lib/governance/policy-simulator.js'
      );
      const simulator = new PolicySimulator();

      const currentResult = simulator.simulate({ intents, proposedPolicies: current_policies });
      const proposedResult = simulator.simulate({ intents, proposedPolicies: proposed_policies });

      // Compute the diff
      const diff = {
        current_summary: currentResult.summary,
        proposed_summary: proposedResult.summary,
        intents_evaluated: intents.length,
        changes: [] as Array<{
          intent_id: string;
          action: string;
          current_decision: string;
          proposed_decision: string;
          change_type: string;
        }>,
      };

      for (let i = 0; i < currentResult.decisions.length; i++) {
        const curr = currentResult.decisions[i];
        const prop = proposedResult.decisions[i];
        if (curr && prop && curr.simulated_decision !== prop.simulated_decision) {
          diff.changes.push({
            intent_id: curr.intent_id,
            action: curr.action,
            current_decision: curr.simulated_decision,
            proposed_decision: prop.simulated_decision,
            change_type: prop.change,
          });
        }
      }

      res.json({
        success: true,
        data: diff,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
