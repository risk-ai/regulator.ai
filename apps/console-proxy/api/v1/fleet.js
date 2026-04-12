/**
 * Fleet Analytics API — Agent Fleet Control Tower
 * Aggregates agent health, performance, risk, and activity metrics.
 * TENANT-ISOLATED: All queries filter by tenant_id
 *
 * Schema: agent_registry (id, agent_id, display_name, description, agent_type,
 *   status, trust_score, last_heartbeat, config, tags, rate_limit_per_minute,
 *   rate_limit_per_hour, registered_at, registered_by, updated_at, tenant_id)
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/fleet/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── Fleet summary (for FleetPremium main view) ──────────────────
    if (req.method === 'GET' && path === '/summary') {
      const [counts, topAgents, typeBreakdown, recentActivity] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'active') AS active,
            COUNT(*) FILTER (WHERE last_heartbeat > NOW() - INTERVAL '5 minutes') AS live,
            COUNT(*) FILTER (WHERE last_heartbeat > NOW() - INTERVAL '1 hour'
              AND last_heartbeat <= NOW() - INTERVAL '5 minutes') AS stale,
            COUNT(*) FILTER (WHERE status = 'suspended') AS suspended,
            AVG(trust_score)::int AS avg_trust,
            MIN(trust_score) AS min_trust,
            MAX(trust_score) AS max_trust
          FROM agent_registry WHERE tenant_id = $1
        `, [tenantId]),

        pool.query(`
          SELECT agent_id, display_name, trust_score, last_heartbeat, agent_type, status
          FROM agent_registry WHERE tenant_id = $1
          ORDER BY trust_score DESC NULLS LAST LIMIT 5
        `, [tenantId]),

        pool.query(`
          SELECT agent_type, COUNT(*) AS count
          FROM agent_registry WHERE tenant_id = $1
          GROUP BY agent_type ORDER BY count DESC
        `, [tenantId]),

        // Recent agent-related execution activity
        pool.query(`
          SELECT actor_id AS agent_id, 
            COUNT(DISTINCT execution_id) AS executions_24h,
            COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
            COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - INTERVAL '24 hours' AND actor_id IS NOT NULL
          GROUP BY actor_id ORDER BY executions_24h DESC LIMIT 10
        `, [tenantId]),
      ]);

      const c = counts.rows[0] || {};
      return res.json({
        success: true,
        data: {
          counts: c,
          topAgents: topAgents.rows,
          typeBreakdown: typeBreakdown.rows,
          recentActivity: recentActivity.rows,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Agent health matrix (all agents with health signals) ────────
    if (req.method === 'GET' && path === '/health') {
      const result = await pool.query(`
        SELECT
          ar.agent_id,
          ar.display_name,
          ar.status,
          ar.trust_score,
          ar.agent_type,
          ar.last_heartbeat,
          ar.rate_limit_per_minute,
          ar.rate_limit_per_hour,
          EXTRACT(EPOCH FROM (NOW() - ar.last_heartbeat)) AS seconds_since_heartbeat,
          CASE
            WHEN ar.last_heartbeat > NOW() - INTERVAL '5 minutes' THEN 'healthy'
            WHEN ar.last_heartbeat > NOW() - INTERVAL '1 hour' THEN 'stale'
            WHEN ar.last_heartbeat IS NOT NULL THEN 'offline'
            ELSE 'unknown'
          END AS health_status,
          (SELECT COUNT(DISTINCT execution_id) FROM execution_ledger_events 
           WHERE actor_id = ar.agent_id AND tenant_id = $1 
           AND event_timestamp > NOW() - INTERVAL '24 hours') AS executions_24h,
          (SELECT COUNT(*) FROM execution_ledger_events 
           WHERE actor_id = ar.agent_id AND tenant_id = $1 
           AND event_type = 'execution_rejected'
           AND event_timestamp > NOW() - INTERVAL '24 hours') AS rejections_24h,
          (SELECT COUNT(*) FROM warrants 
           WHERE agent_id = ar.agent_id AND tenant_id = $1 
           AND status = 'active') AS active_warrants
        FROM agent_registry ar
        WHERE ar.tenant_id = $1
        ORDER BY ar.last_heartbeat DESC NULLS LAST
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Agent detail with full activity history ─────────────────────
    if (req.method === 'GET' && path.match(/^\/[^/]+\/activity$/)) {
      const agentId = path.split('/')[1];
      const range = params.range || '7d';
      const interval = timeRangeToInterval(range);

      const [agent, executions, warrants, approvals] = await Promise.all([
        pool.query(
          'SELECT * FROM agent_registry WHERE (agent_id = $1 OR id::text = $1) AND tenant_id = $2',
          [agentId, tenantId]
        ),
        pool.query(`
          SELECT event_type, COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE actor_id = $1 AND tenant_id = $2 AND event_timestamp > NOW() - ${interval}
          GROUP BY event_type
        `, [agentId, tenantId]),
        pool.query(`
          SELECT status, risk_tier, COUNT(*) AS count
          FROM warrants
          WHERE agent_id = $1 AND tenant_id = $2
          GROUP BY status, risk_tier
        `, [agentId, tenantId]),
        pool.query(`
          SELECT status, COUNT(*) AS count,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status IN ('approved','denied')) AS avg_resolution_s
          FROM approval_requests
          WHERE execution_id IN (
            SELECT DISTINCT execution_id FROM execution_ledger_events
            WHERE actor_id = $1 AND tenant_id = $2
          ) AND tenant_id = $2
          GROUP BY status
        `, [agentId, tenantId]),
      ]);

      if (agent.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Agent not found' });
      }

      return res.json({
        success: true,
        data: {
          agent: agent.rows[0],
          executionBreakdown: executions.rows,
          warrantBreakdown: warrants.rows,
          approvalBreakdown: approvals.rows,
          timeRange: range,
        },
      });
    }

    // ── Fleet performance timeline ──────────────────────────────────
    if (req.method === 'GET' && path === '/timeline') {
      const range = params.range || '7d';
      const interval = timeRangeToInterval(range);
      const bucket = ['1h', '6h', '24h'].includes(range) ? "'hour'" : "'day'";

      const result = await pool.query(`
        SELECT
          date_trunc(${bucket}, event_timestamp) AS bucket,
          COUNT(DISTINCT actor_id) AS active_agents,
          COUNT(DISTINCT execution_id) AS executions,
          COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
          COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected
        FROM execution_ledger_events
        WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
        GROUP BY bucket ORDER BY bucket ASC
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Trust score leaderboard ─────────────────────────────────────
    if (req.method === 'GET' && path === '/leaderboard') {
      const result = await pool.query(`
        SELECT
          ar.agent_id,
          ar.display_name,
          ar.trust_score,
          ar.status,
          ar.agent_type,
          ar.last_heartbeat,
          (SELECT COUNT(DISTINCT execution_id) FROM execution_ledger_events 
           WHERE actor_id = ar.agent_id AND tenant_id = $1) AS total_executions,
          (SELECT COUNT(DISTINCT execution_id) FROM execution_ledger_events 
           WHERE actor_id = ar.agent_id AND tenant_id = $1 
           AND event_type = 'execution_completed') AS successful_executions
        FROM agent_registry ar
        WHERE ar.tenant_id = $1
        ORDER BY ar.trust_score DESC NULLS LAST
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // Default: return fleet overview (same as /summary for backward compat)
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      // Redirect to summary
      const agents = await pool.query(
        'SELECT * FROM agent_registry WHERE tenant_id = $1 ORDER BY registered_at DESC',
        [tenantId]
      );
      return res.json({
        success: true,
        data: {
          agents: agents.rows.map(a => ({
            id: a.id,
            agent_id: a.agent_id,
            display_name: a.display_name || 'Unknown',
            description: a.description || '',
            agent_type: a.agent_type || 'autonomous',
            status: a.status || 'active',
            trust_score: a.trust_score || 0,
            last_heartbeat: a.last_heartbeat,
            config: a.config || {},
            tags: a.tags || [],
            rate_limit_per_minute: a.rate_limit_per_minute || 60,
            rate_limit_per_hour: a.rate_limit_per_hour || 1000,
            registered_at: a.registered_at,
          })),
          summary: {
            totalAgents: agents.rows.length,
            activeAgents: agents.rows.filter(a => a.status === 'active').length,
            avgTrust: agents.rows.length > 0 
              ? Math.round(agents.rows.reduce((s, a) => s + (a.trust_score || 0), 0) / agents.rows.length * 10) / 10
              : 0,
          },
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[fleet]', error);
    captureException(error, { endpoint: 'fleet', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'FLEET_ERROR' });
  }
};

function timeRangeToInterval(range) {
  const map = {
    '1h': "INTERVAL '1 hour'",
    '6h': "INTERVAL '6 hours'",
    '24h': "INTERVAL '24 hours'",
    '7d': "INTERVAL '7 days'",
    '30d': "INTERVAL '30 days'",
    '90d': "INTERVAL '90 days'",
  };
  return map[range] || "INTERVAL '7 days'";
}
