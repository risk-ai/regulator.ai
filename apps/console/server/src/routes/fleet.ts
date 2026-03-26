/**
 * Fleet Routes — Agent Fleet Dashboard
 * 
 * GET    /api/v1/fleet                    — Fleet overview (all agents + summary stats)
 * GET    /api/v1/fleet/summary            — Aggregate fleet metrics
 * GET    /api/v1/fleet/alerts             — All unresolved alerts across fleet
 * POST   /api/v1/fleet/alerts/:id/resolve — Resolve an alert
 * GET    /api/v1/fleet/:agentId           — Single agent detail with activity history
 * GET    /api/v1/fleet/:agentId/activity  — Paginated activity log for agent
 * GET    /api/v1/fleet/:agentId/metrics   — Agent metrics
 * POST   /api/v1/fleet/:agentId/suspend   — Suspend an agent
 * POST   /api/v1/fleet/:agentId/activate  — Reactivate an agent
 * PUT    /api/v1/fleet/:agentId/trust     — Manually adjust trust score
 */

import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db/postgres.js';
import { FleetMetricsService } from '../services/fleetMetricsService.js';
import type { SuccessResponse, ErrorResponse } from '../types/api.js';

const metricsService = new FleetMetricsService();

export function createFleetRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/fleet — Fleet overview
   */
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const agents = await query(
        `SELECT r.*,
           (SELECT COUNT(*) FROM agent_activity a WHERE a.agent_id = r.agent_id AND a.created_at >= CURRENT_DATE)::int AS actions_today,
           (SELECT COALESCE(AVG(a.latency_ms), 0) FROM agent_activity a WHERE a.agent_id = r.agent_id)::int AS avg_latency_ms,
           (SELECT COUNT(*) FILTER (WHERE a.result = 'failed') * 100.0 / NULLIF(COUNT(*), 0)
            FROM agent_activity a WHERE a.agent_id = r.agent_id)::int AS error_rate,
           (SELECT COUNT(*) FROM agent_alerts al WHERE al.agent_id = r.agent_id AND al.resolved = false)::int AS unresolved_alerts
         FROM agent_registry r
         ORDER BY r.status ASC, r.trust_score DESC`
      );

      const summary = await metricsService.getFleetSummary();

      const response: SuccessResponse<any> = {
        success: true,
        data: { agents, summary },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/fleet/summary — Aggregate fleet metrics
   */
  router.get('/summary', async (_req: Request, res: Response) => {
    try {
      const summary = await metricsService.getFleetSummary();
      const response: SuccessResponse<any> = {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_SUMMARY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/fleet/alerts — All unresolved alerts
   */
  router.get('/alerts', async (_req: Request, res: Response) => {
    try {
      const alerts = await query(
        `SELECT al.*, r.display_name as agent_name
         FROM agent_alerts al
         LEFT JOIN agent_registry r ON al.agent_id = r.agent_id
         WHERE al.resolved = false
         ORDER BY
           CASE al.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
           al.created_at DESC`
      );
      const response: SuccessResponse<any> = {
        success: true,
        data: alerts,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_ALERTS_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/fleet/alerts/:id/resolve — Resolve an alert
   */
  router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { resolved_by } = req.body || {};
      await execute(
        `UPDATE agent_alerts SET resolved = true, resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
        [resolved_by || 'operator', id]
      );
      const response: SuccessResponse<any> = {
        success: true,
        data: { id, resolved: true },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RESOLVE_ALERT_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/fleet/:agentId — Single agent detail
   */
  router.get('/:agentId', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const agent = await queryOne(
        `SELECT * FROM agent_registry WHERE agent_id = $1`,
        [agentId]
      );
      if (!agent) {
        const err: ErrorResponse = {
          success: false,
          error: 'Agent not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(err);
        return;
      }

      const recentActivity = await query(
        `SELECT * FROM agent_activity WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [agentId]
      );
      const alerts = await query(
        `SELECT * FROM agent_alerts WHERE agent_id = $1 AND resolved = false ORDER BY created_at DESC`,
        [agentId]
      );
      const metrics = await metricsService.getAgentMetrics(agentId);

      const response: SuccessResponse<any> = {
        success: true,
        data: { agent, recentActivity, alerts, metrics },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_AGENT_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/fleet/:agentId/activity — Paginated activity log
   */
  router.get('/:agentId/activity', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const rows = await query(
        `SELECT * FROM agent_activity WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [agentId, limit, offset]
      );
      const total = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM agent_activity WHERE agent_id = $1`,
        [agentId]
      );

      const response: SuccessResponse<any> = {
        success: true,
        data: { rows, total: parseInt(total?.count || '0'), limit, offset },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_ACTIVITY_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * GET /api/v1/fleet/:agentId/metrics — Agent metrics
   */
  router.get('/:agentId/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = await metricsService.getAgentMetrics(req.params.agentId);
      const response: SuccessResponse<any> = {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FLEET_METRICS_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/fleet/:agentId/suspend — Suspend an agent
   */
  router.post('/:agentId/suspend', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      await execute(
        `UPDATE agent_registry SET status = 'suspended', updated_at = NOW() WHERE agent_id = $1`,
        [agentId]
      );
      const response: SuccessResponse<any> = {
        success: true,
        data: { agent_id: agentId, status: 'suspended' },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUSPEND_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * POST /api/v1/fleet/:agentId/activate — Reactivate an agent
   */
  router.post('/:agentId/activate', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      await execute(
        `UPDATE agent_registry SET status = 'active', updated_at = NOW() WHERE agent_id = $1`,
        [agentId]
      );
      const response: SuccessResponse<any> = {
        success: true,
        data: { agent_id: agentId, status: 'active' },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACTIVATE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  /**
   * PUT /api/v1/fleet/:agentId/trust — Manually adjust trust score
   */
  router.put('/:agentId/trust', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { trust_score } = req.body;

      if (typeof trust_score !== 'number' || trust_score < 0 || trust_score > 100) {
        const err: ErrorResponse = {
          success: false,
          error: 'trust_score must be a number between 0 and 100',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(err);
        return;
      }

      await execute(
        `UPDATE agent_registry SET trust_score = $1, updated_at = NOW() WHERE agent_id = $2`,
        [trust_score, agentId]
      );
      const response: SuccessResponse<any> = {
        success: true,
        data: { agent_id: agentId, trust_score },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      const err: ErrorResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TRUST_UPDATE_ERROR',
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(err);
    }
  });

  return router;
}
