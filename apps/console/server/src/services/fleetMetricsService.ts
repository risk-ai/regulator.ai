/**
 * Fleet Metrics Service
 * 
 * Computes real-time fleet metrics from agent_registry, agent_activity, and agent_alerts tables.
 */

import { query, queryOne } from '../db/postgres.js';

export interface FleetSummary {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  suspendedAgents: number;
  actionsToday: number;
  actionsThisHour: number;
  actionsThisMinute: number;
  avgLatencyMs: number;
  violationsCount: number;
  unresolvedAlerts: number;
  actionsByResult: Record<string, number>;
  topAgentsByVolume: { agent_id: string; display_name: string; count: number }[];
  agentsNeedingAttention: { agent_id: string; display_name: string; reason: string }[];
  trendData: { hour: string; count: number }[];
}

export interface AgentMetrics {
  actionsToday: number;
  actionsThisWeek: number;
  avgLatencyMs: number;
  approvalRate: number;
  errorRate: number;
  deniedRate: number;
  actionsByType: Record<string, number>;
  actionsByResult: Record<string, number>;
  trendData: { hour: string; count: number }[];
}

export class FleetMetricsService {
  /**
   * Get aggregate fleet summary
   */
  async getFleetSummary(): Promise<FleetSummary> {
    // Agent counts by status
    const statusCounts = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text as count FROM agent_registry GROUP BY status`
    );
    const statusMap: Record<string, number> = {};
    let totalAgents = 0;
    for (const row of statusCounts) {
      statusMap[row.status] = parseInt(row.count);
      totalAgents += parseInt(row.count);
    }

    // Actions today / this hour / this minute
    const actionCounts = await queryOne<{
      today: string;
      this_hour: string;
      this_minute: string;
      avg_latency: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text AS today,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('hour', NOW()))::text AS this_hour,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 minute')::text AS this_minute,
        COALESCE(AVG(latency_ms) FILTER (WHERE created_at >= CURRENT_DATE), 0)::text AS avg_latency
      FROM agent_activity
    `);

    // Actions by result
    const resultCounts = await query<{ result: string; count: string }>(
      `SELECT result, COUNT(*)::text as count FROM agent_activity WHERE created_at >= CURRENT_DATE GROUP BY result`
    );
    const actionsByResult: Record<string, number> = {};
    for (const row of resultCounts) {
      actionsByResult[row.result] = parseInt(row.count);
    }

    // Unresolved alerts count
    const alertCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM agent_alerts WHERE resolved = false`
    );

    // Violations count (policy_violation alerts)
    const violationsCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM agent_alerts WHERE resolved = false AND alert_type = 'policy_violation'`
    );

    // Top agents by volume today
    const topAgents = await query<{ agent_id: string; display_name: string; count: string }>(
      `SELECT a.agent_id, COALESCE(r.display_name, a.agent_id) as display_name, COUNT(*)::text as count
       FROM agent_activity a
       LEFT JOIN agent_registry r ON a.agent_id = r.agent_id
       WHERE a.created_at >= CURRENT_DATE
       GROUP BY a.agent_id, r.display_name
       ORDER BY count DESC
       LIMIT 5`
    );

    // Agents needing attention
    const attention = await query<{ agent_id: string; display_name: string; reason: string }>(
      `SELECT agent_id, display_name,
         CASE
           WHEN status = 'suspended' THEN 'Suspended'
           WHEN trust_score < 50 THEN 'Low trust score (' || trust_score || ')'
           WHEN last_heartbeat < NOW() - INTERVAL '10 minutes' THEN 'No heartbeat'
           ELSE 'Unknown'
         END as reason
       FROM agent_registry
       WHERE status = 'suspended'
         OR trust_score < 50
         OR (status = 'active' AND last_heartbeat < NOW() - INTERVAL '10 minutes')
       ORDER BY trust_score ASC
       LIMIT 10`
    );

    // Trend data (actions per hour, last 24h)
    const trend = await query<{ hour: string; count: string }>(
      `SELECT date_trunc('hour', created_at)::text as hour, COUNT(*)::text as count
       FROM agent_activity
       WHERE created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY date_trunc('hour', created_at)
       ORDER BY hour`
    );

    return {
      totalAgents,
      activeAgents: statusMap['active'] || 0,
      idleAgents: statusMap['idle'] || 0,
      suspendedAgents: statusMap['suspended'] || 0,
      actionsToday: parseInt(actionCounts?.today || '0'),
      actionsThisHour: parseInt(actionCounts?.this_hour || '0'),
      actionsThisMinute: parseInt(actionCounts?.this_minute || '0'),
      avgLatencyMs: Math.round(parseFloat(actionCounts?.avg_latency || '0')),
      violationsCount: parseInt(violationsCount?.count || '0'),
      unresolvedAlerts: parseInt(alertCount?.count || '0'),
      actionsByResult,
      topAgentsByVolume: topAgents.map(a => ({ ...a, count: parseInt(a.count) })),
      agentsNeedingAttention: attention,
      trendData: trend.map(t => ({ hour: t.hour, count: parseInt(t.count) })),
    };
  }

  /**
   * Get metrics for a specific agent
   */
  async getAgentMetrics(agentId: string): Promise<AgentMetrics> {
    const counts = await queryOne<{
      today: string;
      this_week: string;
      avg_latency: string;
      total: string;
      executed: string;
      denied: string;
      failed: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text AS today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::text AS this_week,
        COALESCE(AVG(latency_ms), 0)::text AS avg_latency,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE result = 'executed')::text AS executed,
        COUNT(*) FILTER (WHERE result = 'denied')::text AS denied,
        COUNT(*) FILTER (WHERE result = 'failed')::text AS failed
      FROM agent_activity
      WHERE agent_id = $1
    `, [agentId]);

    const total = parseInt(counts?.total || '0');
    const executed = parseInt(counts?.executed || '0');
    const denied = parseInt(counts?.denied || '0');
    const failed = parseInt(counts?.failed || '0');

    // Actions by type
    const byType = await query<{ action_type: string; count: string }>(
      `SELECT action_type, COUNT(*)::text as count
       FROM agent_activity WHERE agent_id = $1
       GROUP BY action_type ORDER BY count DESC`,
      [agentId]
    );
    const actionsByType: Record<string, number> = {};
    for (const row of byType) {
      actionsByType[row.action_type] = parseInt(row.count);
    }

    // Actions by result
    const byResult = await query<{ result: string; count: string }>(
      `SELECT result, COUNT(*)::text as count
       FROM agent_activity WHERE agent_id = $1
       GROUP BY result`,
      [agentId]
    );
    const actionsByResult: Record<string, number> = {};
    for (const row of byResult) {
      actionsByResult[row.result] = parseInt(row.count);
    }

    // Trend data
    const trend = await query<{ hour: string; count: string }>(
      `SELECT date_trunc('hour', created_at)::text as hour, COUNT(*)::text as count
       FROM agent_activity
       WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY date_trunc('hour', created_at)
       ORDER BY hour`,
      [agentId]
    );

    return {
      actionsToday: parseInt(counts?.today || '0'),
      actionsThisWeek: parseInt(counts?.this_week || '0'),
      avgLatencyMs: Math.round(parseFloat(counts?.avg_latency || '0')),
      approvalRate: total > 0 ? Math.round((executed / total) * 100) : 0,
      errorRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      deniedRate: total > 0 ? Math.round((denied / total) * 100) : 0,
      actionsByType,
      actionsByResult,
      trendData: trend.map(t => ({ hour: t.hour, count: parseInt(t.count) })),
    };
  }
}
