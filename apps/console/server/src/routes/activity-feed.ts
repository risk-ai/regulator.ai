/**
 * Activity Feed API
 * 
 * Real-time stream of all agent activity across the organization
 * Phase 31, Feature 2
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { query } from '../db/postgres.js';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createActivityFeedRouter(viennaRuntime: ViennaRuntimeService): Router {
  const router = Router();

  /**
   * Get activity feed
   * GET /api/v1/activity/feed
   */
  router.get('/feed', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { 
        limit = 50,
        offset = 0,
        agent_id,
        action_type,
        status,
        since, // ISO timestamp
        before // ISO timestamp
      } = req.query;

      // Query from audit_log (fallback if execution_ledger_events doesn't exist)
      let sql = `
        SELECT 
          a.id as event_id,
          a.created_at as timestamp,
          a.event as event_type,
          a.details->>'execution_id' as execution_id,
          COALESCE(a.details->>'status', 'completed') as status,
          a.tenant_id,
          COALESCE(a.details->>'objective', a.details->>'action', 'Unknown') as objective,
          COALESCE(a.details->>'agent_id', a.agent_id) as agent_id,
          ag.display_name as agent_display_name
        FROM audit_log a
        LEFT JOIN agents ag ON ag.id = COALESCE(a.details->>'agent_id', a.agent_id)
        WHERE a.tenant_id = $1
          AND a.event LIKE '%execution%'
      `;
      
      const params: any[] = [tenantId];
      let paramIndex = 2;
      
      if (agent_id) {
        sql += ` AND a.agent_id = $${paramIndex}`;
        params.push(agent_id);
        paramIndex++;
      }
      
      if (status) {
        sql += ` AND e.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      
      if (since) {
        sql += ` AND e.timestamp >= $${paramIndex}`;
        params.push(since);
        paramIndex++;
      }
      
      if (before) {
        sql += ` AND e.timestamp < $${paramIndex}`;
        params.push(before);
        paramIndex++;
      }
      
      sql += ` ORDER BY e.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(Number(limit), Number(offset));
      
      const events = await query<any>(sql, params);

      // Format events for response
      const enrichedEvents = events.map((event: any) => ({
        id: event.event_id,
        timestamp: event.timestamp,
        type: event.event_type,
        agent: {
          id: event.agent_id,
          display_name: event.agent_display_name || event.agent_id || 'Unknown'
        },
        execution: {
          id: event.execution_id,
          status: event.status,
          objective: event.objective
        }
      }));

      res.json({
        success: true,
        data: enrichedEvents,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: enrichedEvents.length
        }
      });
    } catch (error) {
      console.error('[ActivityFeed] Get feed error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activity feed',
        code: 'ACTIVITY_FEED_ERROR'
      });
    }
  });

  /**
   * Get activity summary
   * GET /api/v1/activity/summary
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { period = '24h' } = req.query; // 1h, 24h, 7d, 30d

      // Calculate time range
      let since = new Date();
      switch (period) {
        case '1h':
          since.setHours(since.getHours() - 1);
          break;
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

      // Get events for period from audit_log (fallback)
      const events = await query<any>(
        `SELECT 
          a.id,
          a.created_at as timestamp,
          a.event as event_type,
          a.details->>'execution_id' as execution_id,
          COALESCE(a.details->>'status', 'completed') as status,
          a.tenant_id,
          COALESCE(a.details->>'objective', a.details->>'action', 'Unknown') as objective,
          COALESCE(a.details->>'agent_id', a.agent_id) as agent_id,
          ag.display_name as agent_display_name
        FROM audit_log a
        LEFT JOIN agents ag ON ag.id = COALESCE(a.details->>'agent_id', a.agent_id)
        WHERE a.tenant_id = $1 
          AND a.created_at >= $2
          AND a.event LIKE '%execution%'
        ORDER BY a.created_at DESC
        LIMIT 10000`,
        [tenantId, since.toISOString()]
      );

      // Aggregate statistics
      const summary = {
        period,
        total_actions: events.length,
        actions_by_status: {} as Record<string, number>,
        actions_by_type: {} as Record<string, number>,
        actions_by_agent: {} as Record<string, number>,
        policy_violations: 0,
        approvals_requested: 0,
        avg_duration_ms: 0,
        top_agents: [] as Array<{ agent_id: string; count: number }>,
        top_actions: [] as Array<{ action_type: string; count: number }>
      };

      let totalDuration = 0;
      let durationCount = 0;

      events.forEach((event: any) => {
        // By status
        summary.actions_by_status[event.status] = 
          (summary.actions_by_status[event.status] || 0) + 1;

        // By type (event_type as proxy for action_type)
        const eventType = event.event_type || 'unknown';
        summary.actions_by_type[eventType] = 
          (summary.actions_by_type[eventType] || 0) + 1;

        // By agent
        const agentId = event.agent_id || 'unknown';
        summary.actions_by_agent[agentId] = 
          (summary.actions_by_agent[agentId] || 0) + 1;

        // Approvals
        if (event.status === 'pending_approval' || event.status === 'awaiting_approval') {
          summary.approvals_requested++;
        }
      });

      // Calculate average duration
      if (durationCount > 0) {
        summary.avg_duration_ms = Math.round(totalDuration / durationCount);
      }

      // Top agents
      summary.top_agents = Object.entries(summary.actions_by_agent)
        .map(([agent_id, count]) => ({ agent_id, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top actions
      summary.top_actions = Object.entries(summary.actions_by_type)
        .map(([action_type, count]) => ({ action_type, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('[ActivityFeed] Get summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activity summary',
        code: 'ACTIVITY_SUMMARY_ERROR'
      });
    }
  });

  /**
   * Get activity timeline
   * GET /api/v1/activity/timeline
   */
  router.get('/timeline', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);
      
      const { 
        period = '24h',
        interval = '1h' // 5m, 15m, 1h, 1d
      } = req.query;

      // Calculate time range
      let since = new Date();
      switch (period) {
        case '1h':
          since.setHours(since.getHours() - 1);
          break;
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

      // Get events from database
      const events = await query<any>(
        `SELECT *
        FROM execution_ledger_events
        WHERE tenant_id = $1 AND timestamp >= $2
        ORDER BY timestamp DESC
        LIMIT 10000`,
        [tenantId, since.toISOString()]
      );

      // Calculate interval duration in ms
      let intervalMs = 3600000; // 1 hour default
      switch (interval) {
        case '5m':
          intervalMs = 300000;
          break;
        case '15m':
          intervalMs = 900000;
          break;
        case '1h':
          intervalMs = 3600000;
          break;
        case '1d':
          intervalMs = 86400000;
          break;
      }

      // Group events by interval
      const timeline: Record<string, any> = {};
      
      events.forEach((event: any) => {
        const eventTime = new Date(event.timestamp);
        const intervalStart = new Date(
          Math.floor(eventTime.getTime() / intervalMs) * intervalMs
        );
        const key = intervalStart.toISOString();

        if (!timeline[key]) {
          timeline[key] = {
            timestamp: key,
            total: 0,
            by_status: {},
            by_type: {}
          };
        }

        timeline[key].total++;
        timeline[key].by_status[event.status] = 
          (timeline[key].by_status[event.status] || 0) + 1;
        const eventType = event.event_type || 'unknown';
        timeline[key].by_type[eventType] = 
          (timeline[key].by_type[eventType] || 0) + 1;
      });

      // Convert to array and sort
      const timelineArray = Object.values(timeline).sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      res.json({
        success: true,
        data: timelineArray,
        period,
        interval
      });
    } catch (error) {
      console.error('[ActivityFeed] Get timeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get activity timeline',
        code: 'ACTIVITY_TIMELINE_ERROR'
      });
    }
  });

  /**
   * SSE endpoint for live activity updates
   * GET /api/v1/activity/stream
   */
  router.get('/stream', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = getTenantId(authReq);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Note: Real-time event streaming is available via /api/v1/stream endpoint
    // This endpoint provides a simple heartbeat-only feed
    // For full SSE events, clients should use the dedicated stream endpoint
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  return router;
}
