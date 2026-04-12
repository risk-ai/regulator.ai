/**
 * Dashboard Metrics API — Real-Time Control Tower
 * Aggregates live stats from all major tables for the premium dashboard
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Schema reference (regulator.*):
 *   policy_evaluations: rule_id, intent_id, agent_id, result, evaluated_at
 *   intents: id, agent_id, action, status, created_at
 *   warrants: id, intent_id, agent_id, risk_tier, status, created_at
 *   approval_requests: approval_id, intent_id, required_tier, status, created_at, updated_at
 *   agent_registry: id, agent_id, display_name, status, last_heartbeat, registered_at
 *   execution_ledger_events: event_id, execution_id, event_type, stage, actor_id, risk_tier, event_timestamp
 *   audit_log: id, event_type, actor, details, created_at
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/dashboard/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── Main dashboard metrics (all cards) ──────────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const timeRange = params.range || '24h';
      const interval = timeRangeToInterval(timeRange);

      const [
        overviewResult,
        agentResult,
        approvalResult,
        policyResult,
        executionTrendResult,
        riskResult,
        recentActivityResult,
        systemHealthResult,
      ] = await Promise.all([
        // 1. Overview counters
        pool.query(`
          SELECT
            (SELECT COUNT(*) FROM warrants WHERE tenant_id = $1) AS total_warrants,
            (SELECT COUNT(*) FROM warrants WHERE tenant_id = $1 AND status = 'active') AS active_warrants,
            (SELECT COUNT(*) FROM policies WHERE tenant_id = $1 AND enabled = 1) AS active_policies,
            (SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1) AS total_agents,
            (SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1 
              AND last_heartbeat > NOW() - INTERVAL '1 hour') AS online_agents,
            (SELECT COUNT(DISTINCT execution_id) FROM execution_ledger_events 
              WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}) AS executions_period,
            (SELECT COUNT(*) FROM approval_requests WHERE tenant_id = $1 AND status = 'pending') AS pending_approvals,
            (SELECT COUNT(*) FROM policy_evaluations WHERE tenant_id = $1 
              AND evaluated_at > NOW() - ${interval}) AS evaluations_period,
            (SELECT COUNT(*) FROM audit_log WHERE tenant_id = $1 
              AND created_at > NOW() - ${interval}) AS audit_events_period,
            (SELECT COUNT(*) FROM incidents WHERE tenant_id = $1 AND status = 'open') AS open_incidents
        `, [tenantId]),

        // 2. Agent breakdown by status
        pool.query(`
          SELECT 
            status,
            COUNT(*) AS count,
            COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - last_heartbeat))), 0) AS avg_seconds_since_heartbeat
          FROM agent_registry
          WHERE tenant_id = $1
          GROUP BY status
          ORDER BY count DESC
        `, [tenantId]),

        // 3. Approval metrics
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'denied') AS denied,
            COUNT(*) FILTER (WHERE status = 'expired') AS expired,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status IN ('approved','denied')) AS avg_resolution_seconds,
            COUNT(*) FILTER (WHERE created_at > NOW() - ${interval}) AS new_this_period
          FROM approval_requests
          WHERE tenant_id = $1
        `, [tenantId]),

        // 4. Policy evaluation stats
        pool.query(`
          SELECT
            COUNT(*) AS total_evaluations,
            COUNT(*) FILTER (WHERE result = 'allow') AS allowed,
            COUNT(*) FILTER (WHERE result = 'deny') AS denied,
            COUNT(*) FILTER (WHERE result = 'require_approval') AS require_approval,
            ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'allow') / NULLIF(COUNT(*), 0), 1) AS allow_rate
          FROM policy_evaluations
          WHERE tenant_id = $1 AND evaluated_at > NOW() - ${interval}
        `, [tenantId]),

        // 5. Execution trend (bucketed by hour/day)
        pool.query(`
          SELECT
            date_trunc(${timeRange === '24h' ? "'hour'" : "'day'"}, event_timestamp) AS bucket,
            COUNT(DISTINCT execution_id) AS executions,
            COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
            COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
          GROUP BY bucket
          ORDER BY bucket ASC
        `, [tenantId]),

        // 6. Risk distribution (from warrants risk_tier)
        pool.query(`
          SELECT
            COALESCE(risk_tier::text, 'unclassified') AS risk_tier,
            COUNT(*) AS count
          FROM warrants
          WHERE tenant_id = $1
          GROUP BY risk_tier
          ORDER BY count DESC
        `, [tenantId]),

        // 7. Recent activity feed (last 20)
        pool.query(`
          SELECT id, event_type, actor, details, created_at
          FROM audit_log
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `, [tenantId]),

        // 8. System health (integration status, webhook delivery)
        pool.query(`
          SELECT
            (SELECT COUNT(*) FROM integrations WHERE tenant_id = $1 AND enabled = true) AS active_integrations,
            (SELECT COUNT(*) FROM webhooks WHERE tenant_id = $1 AND active = true) AS active_webhooks,
            (SELECT COUNT(*) FROM webhook_deliveries WHERE tenant_id = $1 
              AND delivered_at > NOW() - INTERVAL '1 hour' AND status = 'failed') AS failed_webhooks_1h,
            (SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND revoked = false 
              AND (expires_at IS NULL OR expires_at > NOW())) AS active_api_keys
        `, [tenantId]),
      ]);

      return res.json({
        success: true,
        data: {
          overview: overviewResult.rows[0],
          agents: agentResult.rows,
          approvals: approvalResult.rows[0],
          policyEvaluations: policyResult.rows[0],
          executionTrend: executionTrendResult.rows,
          riskDistribution: riskResult.rows,
          recentActivity: recentActivityResult.rows,
          systemHealth: systemHealthResult.rows[0],
          timeRange,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Sparkline data (lightweight, for individual metric cards) ────
    if (req.method === 'GET' && path === '/sparklines') {
      const metric = params.metric || 'executions';
      const points = Math.min(parseInt(params.points || '24', 10), 48);
      const range = params.range || '24h';
      const interval = timeRangeToInterval(range);
      const bucket = range === '24h' ? "'hour'" : "'day'";

      let query;
      switch (metric) {
        case 'executions':
          query = `
            SELECT date_trunc(${bucket}, event_timestamp) AS t, COUNT(DISTINCT execution_id) AS v
            FROM execution_ledger_events
            WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
            GROUP BY t ORDER BY t ASC`;
          break;
        case 'evaluations':
          query = `
            SELECT date_trunc(${bucket}, evaluated_at) AS t, COUNT(*) AS v
            FROM policy_evaluations
            WHERE tenant_id = $1 AND evaluated_at > NOW() - ${interval}
            GROUP BY t ORDER BY t ASC`;
          break;
        case 'approvals':
          query = `
            SELECT date_trunc(${bucket}, created_at) AS t, COUNT(*) AS v
            FROM approval_requests
            WHERE tenant_id = $1 AND created_at > NOW() - ${interval}
            GROUP BY t ORDER BY t ASC`;
          break;
        case 'audit':
          query = `
            SELECT date_trunc(${bucket}, created_at) AS t, COUNT(*) AS v
            FROM audit_log
            WHERE tenant_id = $1 AND created_at > NOW() - ${interval}
            GROUP BY t ORDER BY t ASC`;
          break;
        default:
          return res.status(400).json({ success: false, error: `Unknown metric: ${metric}` });
      }

      const result = await pool.query(query, [tenantId]);
      const data = normalizeSparkline(result.rows, points);
      return res.json({ success: true, metric, points: data });
    }

    // ── System health check (real pings) ────────────────────────────
    if (req.method === 'GET' && path === '/health') {
      const start = Date.now();
      const checks = {};

      // DB connectivity
      try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        checks.database = { status: 'operational', latencyMs: Date.now() - dbStart };
      } catch (e) {
        checks.database = { status: 'degraded', error: e.message };
      }

      // Check recent execution throughput
      try {
        const r = await pool.query(`
          SELECT COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - INTERVAL '5 minutes'
        `, [tenantId]);
        checks.executionPipeline = {
          status: 'operational',
          recent5min: parseInt(r.rows[0].count, 10),
        };
      } catch (e) {
        checks.executionPipeline = { status: 'degraded', error: e.message };
      }

      // Check policy engine (recent evaluations)
      try {
        const r = await pool.query(`
          SELECT COUNT(*) AS count
          FROM policy_evaluations
          WHERE tenant_id = $1 AND evaluated_at > NOW() - INTERVAL '5 minutes'
        `, [tenantId]);
        checks.policyEngine = {
          status: 'operational',
          recent5min: parseInt(r.rows[0].count, 10),
        };
      } catch (e) {
        checks.policyEngine = { status: 'degraded', error: e.message };
      }

      // Check approval queue health
      try {
        const r = await pool.query(`
          SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            MIN(created_at) FILTER (WHERE status = 'pending') AS oldest_pending
          FROM approval_requests WHERE tenant_id = $1
        `, [tenantId]);
        const oldest = r.rows[0].oldest_pending;
        const stale = oldest && (Date.now() - new Date(oldest).getTime()) > 3600000;
        checks.approvalQueue = {
          status: stale ? 'warning' : 'operational',
          pending: parseInt(r.rows[0].pending, 10),
          oldestPending: oldest,
        };
      } catch (e) {
        checks.approvalQueue = { status: 'degraded', error: e.message };
      }

      const overallStatus = Object.values(checks).every(c => c.status === 'operational')
        ? 'operational'
        : Object.values(checks).some(c => c.status === 'degraded')
          ? 'degraded'
          : 'warning';

      return res.json({
        success: true,
        data: {
          status: overallStatus,
          checks,
          totalMs: Date.now() - start,
          checkedAt: new Date().toISOString(),
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[dashboard]', error);
    captureException(error, { endpoint: 'dashboard', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'DASHBOARD_ERROR' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────
function timeRangeToInterval(range) {
  const map = {
    '1h': "INTERVAL '1 hour'",
    '6h': "INTERVAL '6 hours'",
    '24h': "INTERVAL '24 hours'",
    '7d': "INTERVAL '7 days'",
    '30d': "INTERVAL '30 days'",
    '90d': "INTERVAL '90 days'",
  };
  return map[range] || "INTERVAL '24 hours'";
}

function normalizeSparkline(rows, points) {
  if (rows.length === 0) return new Array(points).fill(0);
  const values = rows.map(r => parseInt(r.v, 10));
  if (values.length > points) {
    const bucketSize = Math.ceil(values.length / points);
    const result = [];
    for (let i = 0; i < points; i++) {
      const slice = values.slice(i * bucketSize, (i + 1) * bucketSize);
      result.push(slice.reduce((a, b) => a + b, 0));
    }
    return result;
  }
  const padding = new Array(points - values.length).fill(0);
  return [...padding, ...values];
}
