/**
 * Agent Performance Analytics
 * Phase 31, Feature 4
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { query, queryOne } from '../db/postgres.js';

export function createAnalyticsRouter(): Router {
  const router = Router();

  /**
   * Get value summary for dashboard widget
   * GET /api/v1/analytics/value-summary
   */
  router.get('/value-summary', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);

      // Query audit_log for total events
      const auditEvents = await query<any>(
        `SELECT COUNT(*) as count FROM audit_log WHERE tenant_id = $1`,
        [tenantId]
      );

      // Query approval_requests for approvals processed
      const approvalsProcessed = await query<any>(
        `SELECT COUNT(*) as count FROM approval_requests WHERE tenant_id = $1 AND status IN ('approved', 'denied')`,
        [tenantId]
      );

      // Query execution_ledger_summary for actions governed  
      const actionsGoverned = await query<any>(
        `SELECT COUNT(DISTINCT execution_id) as count FROM execution_ledger_summary WHERE tenant_id = $1`,
        [tenantId]
      );

      // Count denied/blocked as "violations caught"
      const violationsCaught = await query<any>(
        `SELECT COUNT(*) as count FROM approval_requests WHERE tenant_id = $1 AND status = 'denied'`,
        [tenantId]
      );

      const auditTotal = parseInt(auditEvents[0]?.count || 0);
      const approvalsTotal = parseInt(approvalsProcessed[0]?.count || 0);
      const actionsTotal = parseInt(actionsGoverned[0]?.count || 0);
      const violationsTotal = parseInt(violationsCaught[0]?.count || 0);

      // For new tenants with no data, return sample/seed numbers with demo flag
      const hasData = auditTotal > 0 || approvalsTotal > 0 || actionsTotal > 0;

      if (!hasData) {
        return res.json({
          success: true,
          data: {
            actions_governed: 247,
            violations_caught: 12,
            approvals_processed: 38,
            estimated_risk_avoided: 142500,
            audit_events: 1247,
            demo: true
          }
        });
      }

      // Estimate risk avoided: violations * average transaction value (use a formula)
      const avgTransactionValue = 11875; // $11,875 average per blocked action
      const estimatedRiskAvoided = violationsTotal * avgTransactionValue;

      res.json({
        success: true,
        data: {
          actions_governed: actionsTotal,
          violations_caught: violationsTotal,
          approvals_processed: approvalsTotal,
          estimated_risk_avoided: estimatedRiskAvoided,
          audit_events: auditTotal,
          demo: false
        }
      });
    } catch (error) {
      console.error('[Analytics] Value summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get value summary',
        code: 'ANALYTICS_VALUE_SUMMARY_ERROR'
      });
    }
  });

  /**
   * Get agent performance metrics
   * GET /api/v1/analytics/agents
   */
  router.get('/agents', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { period = '7d', agent_id } = req.query;

      // Calculate time range
      let since = new Date();
      switch (period) {
        case '24h':
          since.setHours(since.getHours() - 24);
          break;
        case '7d':
          since.setDate(since.getDate() - 7);
          break;
        case '30d':
          since.setDate(since.getDate() - 30);
          break;
      }

      // Query agent performance
      let sql = `
        SELECT 
          a.id,
          a.agent_id,
          a.display_name,
          a.status,
          a.trust_score,
          COUNT(DISTINCT s.execution_id) as total_executions,
          COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.execution_id END) as completed_executions,
          COUNT(DISTINCT CASE WHEN s.status = 'failed' THEN s.execution_id END) as failed_executions,
          COUNT(DISTINCT CASE WHEN s.status = 'pending_approval' THEN s.execution_id END) as pending_approvals,
          AVG(EXTRACT(EPOCH FROM (s.completed_at - s.started_at))) as avg_duration_seconds
        FROM agents a
        LEFT JOIN execution_ledger_summary s ON a.id = s.agent_id AND s.started_at >= $1
        WHERE a.tenant_id = $2
      `;

      const params: any[] = [since.toISOString(), tenantId];
      
      if (agent_id) {
        sql += ` AND a.agent_id = $3`;
        params.push(agent_id);
      }

      sql += ` GROUP BY a.id, a.agent_id, a.display_name, a.status, a.trust_score`;
      sql += ` ORDER BY total_executions DESC`;

      const agents = await query<any>(sql, params);

      // Calculate success rate
      const enrichedAgents = agents.map((agent: any) => ({
        ...agent,
        success_rate: agent.total_executions > 0
          ? Math.round((agent.completed_executions / agent.total_executions) * 100)
          : 0,
        avg_duration_seconds: agent.avg_duration_seconds ? Math.round(agent.avg_duration_seconds) : 0
      }));

      res.json({
        success: true,
        data: enrichedAgents,
        period
      });
    } catch (error) {
      console.error('[Analytics] Agents error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent analytics',
        code: 'ANALYTICS_AGENTS_ERROR'
      });
    }
  });

  /**
   * Get organization-wide metrics
   * GET /api/v1/analytics/organization
   */
  router.get('/organization', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { period = '7d' } = req.query;

      // Calculate time range
      let since = new Date();
      switch (period) {
        case '24h':
          since.setHours(since.getHours() - 24);
          break;
        case '7d':
          since.setDate(since.getDate() - 7);
          break;
        case '30d':
          since.setDate(since.getDate() - 30);
          break;
      }

      // Get execution statistics
      const stats = await query<any>(
        `SELECT 
          COUNT(DISTINCT execution_id) as total_executions,
          COUNT(DISTINCT CASE WHEN status = 'completed' THEN execution_id END) as completed,
          COUNT(DISTINCT CASE WHEN status = 'failed' THEN execution_id END) as failed,
          COUNT(DISTINCT CASE WHEN status = 'pending_approval' THEN execution_id END) as pending_approval,
          COUNT(DISTINCT agent_id) as active_agents,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
        FROM execution_ledger_summary
        WHERE tenant_id = $1 AND started_at >= $2`,
        [tenantId, since.toISOString()]
      );

      const summary = stats[0] || {
        total_executions: 0,
        completed: 0,
        failed: 0,
        pending_approval: 0,
        active_agents: 0,
        avg_duration_seconds: 0
      };

      // Get top agents
      const topAgents = await query<any>(
        `SELECT 
          a.agent_id,
          a.display_name,
          COUNT(DISTINCT s.execution_id) as execution_count
        FROM agents a
        JOIN execution_ledger_summary s ON a.id = s.agent_id
        WHERE a.tenant_id = $1 AND s.started_at >= $2
        GROUP BY a.agent_id, a.display_name
        ORDER BY execution_count DESC
        LIMIT 10`,
        [tenantId, since.toISOString()]
      );

      // Get policy violations (approximation)
      const policyViolations = await query<any>(
        `SELECT COUNT(*) as count
        FROM approval_requests
        WHERE tenant_id = $1 AND requested_at >= $2`,
        [tenantId, since.toISOString()]
      );

      res.json({
        success: true,
        data: {
          period,
          summary: {
            total_executions: parseInt(summary.total_executions),
            completed: parseInt(summary.completed),
            failed: parseInt(summary.failed),
            pending_approval: parseInt(summary.pending_approval),
            active_agents: parseInt(summary.active_agents),
            avg_duration_seconds: summary.avg_duration_seconds ? Math.round(summary.avg_duration_seconds) : 0,
            success_rate: summary.total_executions > 0
              ? Math.round((summary.completed / summary.total_executions) * 100)
              : 0
          },
          top_agents: topAgents,
          policy_violations: parseInt(policyViolations[0]?.count || 0)
        }
      });
    } catch (error) {
      console.error('[Analytics] Organization error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization analytics',
        code: 'ANALYTICS_ORG_ERROR'
      });
    }
  });

  /**
   * Get cost analytics
   * GET /api/v1/analytics/costs
   */
  router.get('/costs', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { period = '7d' } = req.query;

      // Calculate time range
      const endDate = new Date();
      const startDate = new Date();
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
      }

      // Get cost metrics from execution metadata
      // Cost is estimated from token usage in execution results
      const costQuery = `
        SELECT 
          COALESCE(SUM((result->>'estimated_cost')::numeric), 0) as total_cost,
          COUNT(*) as execution_count
        FROM regulator.execution_log
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at < $3
          AND result IS NOT NULL
          AND result->>'estimated_cost' IS NOT NULL
      `;
      
      const costResult = await queryOne<{ total_cost: number; execution_count: number }>(
        costQuery,
        [tenantId, startDate.toISOString(), endDate.toISOString()]
      );

      // Get cost breakdown by agent
      const agentCostQuery = `
        SELECT 
          e.agent_id,
          COALESCE(SUM((e.result->>'estimated_cost')::numeric), 0) as cost,
          COUNT(*) as executions
        FROM regulator.execution_log e
        WHERE e.tenant_id = $1
          AND e.created_at >= $2
          AND e.created_at < $3
          AND e.result IS NOT NULL
          AND e.result->>'estimated_cost' IS NOT NULL
        GROUP BY e.agent_id
        ORDER BY cost DESC
        LIMIT 10
      `;
      
      const agentCosts = await query<{ agent_id: string; cost: number; executions: number }>(
        agentCostQuery,
        [tenantId, startDate.toISOString(), endDate.toISOString()]
      );

      const costData = {
        period,
        total_estimated_cost: parseFloat(costResult?.total_cost?.toString() || '0'),
        execution_count: costResult?.execution_count || 0,
        cost_by_agent: agentCosts.map(row => ({
          agent_id: row.agent_id,
          cost: parseFloat(row.cost.toString()),
          executions: row.executions
        })),
        cost_trend: [] // Trend analysis would require time-bucketing
      };

      res.json({
        success: true,
        data: costData
      });
    } catch (error) {
      console.error('[Analytics] Costs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cost analytics',
        code: 'ANALYTICS_COSTS_ERROR'
      });
    }
  });

  /**
   * Get policy analytics
   * GET /api/v1/analytics/policies
   */
  router.get('/policies', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { period = '7d' } = req.query;

      // Calculate time range
      let since = new Date();
      switch (period) {
        case '24h':
          since.setHours(since.getHours() - 24);
          break;
        case '7d':
          since.setDate(since.getDate() - 7);
          break;
        case '30d':
          since.setDate(since.getDate() - 30);
          break;
      }

      // Get policy trigger statistics
      const policyStats = await query<any>(
        `SELECT 
          p.id,
          p.name,
          COUNT(DISTINCT ar.id) as trigger_count
        FROM policies p
        LEFT JOIN approval_requests ar ON ar.tenant_id = p.tenant_id AND ar.requested_at >= $1
        WHERE p.tenant_id = $2 AND p.enabled = true
        GROUP BY p.id, p.name
        ORDER BY trigger_count DESC`,
        [since.toISOString(), tenantId]
      );

      res.json({
        success: true,
        data: {
          period,
          policies: policyStats
        }
      });
    } catch (error) {
      console.error('[Analytics] Policies error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get policy analytics',
        code: 'ANALYTICS_POLICIES_ERROR'
      });
    }
  });

  return router;
}
