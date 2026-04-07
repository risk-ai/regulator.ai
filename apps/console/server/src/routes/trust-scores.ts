/**
 * Agent Trust Score API Routes — Vienna OS
 */

import { Router, Request, Response } from 'express';
import { query } from '../db/postgres.js';

export function createTrustScoreRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/trust-scores
   * Get trust scores for all agents in the tenant.
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const windowDays = parseInt((req.query.window_days as string) || '30', 10);
      const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

      // Load audit events for the window
      const auditRows = await query<any>(
        `SELECT event, details, risk_tier, created_at
         FROM audit_log
         WHERE tenant_id = $1 AND created_at >= $2
         ORDER BY created_at DESC
         LIMIT 10000`,
        [tenantId, cutoff]
      );

      // Transform to AgentHistoryEvent format
      const events = auditRows.map((row: any) => {
        const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        return {
          event: row.event,
          agent_id: details.agent_id || '',
          action: details.action || '',
          risk_tier: details.risk_tier || `T${row.risk_tier || 0}`,
          approved: row.event?.includes('approved'),
          denied: row.event?.includes('denied'),
          in_scope: !row.event?.includes('scope_drift'),
          anomaly: row.event?.includes('anomaly'),
          anomaly_severity: details.severity || null,
          timestamp: row.created_at,
        };
      }).filter((e: any) => e.agent_id);

      const { AgentTrustEngine } = await import(
        '@vienna-lib/governance/agent-trust-score.js'
      );

      const engine = new AgentTrustEngine();
      const scores = engine.computeAll(tenantId, events);

      // Sort by score descending
      scores.sort((a: any, b: any) => b.score - a.score);

      res.json({
        success: true,
        data: {
          scores,
          window_days: windowDays,
          agents_scored: scores.length,
          fleet_average: scores.length > 0
            ? Math.round(scores.reduce((a: number, b: any) => a + b.score, 0) / scores.length)
            : 0,
          fleet_health: _classifyFleetHealth(scores),
        },
      });
    } catch (error) {
      console.error('[TrustScores] Error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/trust-scores/:agentId
   * Get detailed trust score for a specific agent.
   */
  router.get('/:agentId', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId || 'default';
      const { agentId } = req.params;
      const windowDays = parseInt((req.query.window_days as string) || '30', 10);
      const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

      const auditRows = await query<any>(
        `SELECT event, details, risk_tier, created_at
         FROM audit_log
         WHERE tenant_id = $1 AND created_at >= $2
           AND details->>'agent_id' = $3
         ORDER BY created_at DESC
         LIMIT 5000`,
        [tenantId, cutoff, agentId]
      );

      const events = auditRows.map((row: any) => {
        const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        return {
          event: row.event,
          agent_id: details.agent_id || agentId,
          action: details.action || '',
          risk_tier: details.risk_tier || `T${row.risk_tier || 0}`,
          approved: row.event?.includes('approved'),
          denied: row.event?.includes('denied'),
          in_scope: !row.event?.includes('scope_drift'),
          anomaly: row.event?.includes('anomaly'),
          anomaly_severity: details.severity || null,
          timestamp: row.created_at,
        };
      });

      const { AgentTrustEngine } = await import(
        '@vienna-lib/governance/agent-trust-score.js'
      );

      const engine = new AgentTrustEngine();
      const score = engine.computeScore(agentId, tenantId, events);

      res.json({ success: true, data: score });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

// Helper
function _classifyFleetHealth(scores: any[]): string {
  if (scores.length === 0) return 'no_agents';
  const avg = scores.reduce((a: number, b: any) => a + b.score, 0) / scores.length;
  const restricted = scores.filter((s: any) => s.level === 'restricted' || s.level === 'probation').length;
  if (restricted > scores.length * 0.2) return 'critical';
  if (avg >= 80) return 'healthy';
  if (avg >= 60) return 'moderate';
  return 'needs_attention';
}

// Need to attach to the prototype for method access
(createTrustScoreRouter as any)._classifyFleetHealth = _classifyFleetHealth;
