/**
 * Analytics API — Deep Governance Intelligence
 * Real aggregation queries: policy hit rates, approval latency,
 * agent risk distribution, time-series with selectable ranges.
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Schema reference (regulator.*):
 *   policy_evaluations: id, rule_id, intent_id, agent_id, result, evaluated_at, conditions_checked
 *   policies: id, name, enabled, priority, tier, tenant_id
 *   approval_requests: approval_id, intent_id, required_tier, status, created_at, updated_at
 *   agent_registry: id, agent_id, display_name, status, last_heartbeat
 *   execution_ledger_events: event_id, execution_id, event_type, actor_id, risk_tier, event_timestamp
 *   warrants: id, agent_id, risk_tier, status
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/analytics/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  const range = params.range || '30d';
  const interval = timeRangeToInterval(range);

  try {
    // ── Overview analytics ──────────────────────────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const [
        policyHitRates,
        approvalLatency,
        agentRisk,
        executionVolume,
        topActions,
        complianceScore,
      ] = await Promise.all([
        // Policy hit rates — which policies fire most (join via rule_id)
        pool.query(`
          SELECT 
            p.name AS policy_name,
            p.id AS policy_id,
            COUNT(pe.id) AS evaluation_count,
            COUNT(*) FILTER (WHERE pe.result = 'allow') AS allowed,
            COUNT(*) FILTER (WHERE pe.result = 'deny') AS denied,
            COUNT(*) FILTER (WHERE pe.result = 'require_approval') AS escalated,
            ROUND(100.0 * COUNT(*) FILTER (WHERE pe.result = 'deny') / NULLIF(COUNT(*), 0), 1) AS deny_rate
          FROM policies p
          LEFT JOIN policy_evaluations pe ON pe.rule_id = p.id 
            AND pe.evaluated_at > NOW() - ${interval}
            AND pe.tenant_id = $1
          WHERE p.tenant_id = $1
          GROUP BY p.id, p.name
          ORDER BY evaluation_count DESC
          LIMIT 20
        `, [tenantId]),

        // Approval latency distribution (bucketed)
        pool.query(`
          SELECT
            CASE
              WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 60 THEN 'under_1min'
              WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 300 THEN '1_5min'
              WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 900 THEN '5_15min'
              WHEN EXTRACT(EPOCH FROM (updated_at - created_at)) < 3600 THEN '15_60min'
              ELSE 'over_1hr'
            END AS latency_bucket,
            COUNT(*) AS count,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg_seconds
          FROM approval_requests
          WHERE tenant_id = $1 
            AND status IN ('approved', 'denied')
            AND created_at > NOW() - ${interval}
          GROUP BY latency_bucket
          ORDER BY avg_seconds ASC
        `, [tenantId]),

        // Agent risk distribution
        pool.query(`
          SELECT
            ar.agent_id,
            ar.display_name AS agent_name,
            ar.status,
            COUNT(DISTINCT ele.execution_id) AS total_executions,
            COUNT(DISTINCT ele.execution_id) FILTER (
              WHERE ele.event_type = 'execution_rejected'
            ) AS rejected_executions,
            COUNT(DISTINCT w.id) AS warrant_count,
            ROUND(100.0 * COUNT(DISTINCT ele.execution_id) FILTER (
              WHERE ele.event_type = 'execution_rejected'
            ) / NULLIF(COUNT(DISTINCT ele.execution_id), 0), 1) AS rejection_rate
          FROM agent_registry ar
          LEFT JOIN execution_ledger_events ele ON ele.actor_id = ar.agent_id 
            AND ele.tenant_id = $1
            AND ele.event_timestamp > NOW() - ${interval}
          LEFT JOIN warrants w ON w.agent_id = ar.agent_id AND w.tenant_id = $1
          WHERE ar.tenant_id = $1
          GROUP BY ar.agent_id, ar.display_name, ar.status
          ORDER BY total_executions DESC
          LIMIT 20
        `, [tenantId]),

        // Execution volume time-series
        pool.query(`
          SELECT
            date_trunc(${range === '24h' || range === '1h' || range === '6h' ? "'hour'" : "'day'"}, event_timestamp) AS bucket,
            COUNT(DISTINCT execution_id) AS total,
            COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_completed') AS completed,
            COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_rejected') AS rejected,
            COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'approval_required') AS escalated
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
          GROUP BY bucket
          ORDER BY bucket ASC
        `, [tenantId]),

        // Top action types from intents
        pool.query(`
          SELECT
            action AS action_type,
            COUNT(*) AS usage_count
          FROM intents
          WHERE tenant_id = $1 AND created_at > NOW() - ${interval}
          GROUP BY action
          ORDER BY usage_count DESC
          LIMIT 15
        `, [tenantId]),

        // Compliance posture score
        pool.query(`
          SELECT
            (SELECT COUNT(*) FROM policies WHERE tenant_id = $1 AND enabled = 1) AS enabled_policies,
            (SELECT COUNT(*) FROM policies WHERE tenant_id = $1) AS total_policies,
            (SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1 
              AND last_heartbeat > NOW() - INTERVAL '1 hour') AS monitored_agents,
            (SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1) AS total_agents,
            (SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND revoked = false 
              AND expires_at IS NOT NULL AND expires_at > NOW()) AS rotatable_keys,
            (SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND revoked = false) AS total_keys,
            (SELECT COUNT(*) FROM webhooks WHERE tenant_id = $1 AND active = true) AS active_webhooks,
            (SELECT COUNT(*) FROM data_retention_policies WHERE tenant_id = $1 AND enabled = true) AS retention_policies
        `, [tenantId]),
      ]);

      // Calculate compliance score (0-100)
      const cs = complianceScore.rows[0];
      const scores = [];
      if (parseInt(cs.total_policies) > 0) scores.push(parseInt(cs.enabled_policies) / parseInt(cs.total_policies));
      if (parseInt(cs.total_agents) > 0) scores.push(parseInt(cs.monitored_agents) / parseInt(cs.total_agents));
      if (parseInt(cs.total_keys) > 0) scores.push(parseInt(cs.rotatable_keys) / parseInt(cs.total_keys));
      scores.push(parseInt(cs.active_webhooks) > 0 ? 1 : 0);
      scores.push(parseInt(cs.retention_policies) > 0 ? 1 : 0);
      const compliancePercent = scores.length > 0 
        ? Math.round(100 * scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

      return res.json({
        success: true,
        data: {
          policyHitRates: policyHitRates.rows,
          approvalLatency: approvalLatency.rows,
          agentRisk: agentRisk.rows,
          executionVolume: executionVolume.rows,
          topActions: topActions.rows,
          complianceScore: {
            score: compliancePercent,
            breakdown: cs,
          },
          timeRange: range,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Policy effectiveness detail ─────────────────────────────────
    if (req.method === 'GET' && path === '/policies') {
      const result = await pool.query(`
        SELECT 
          p.id,
          p.name,
          p.enabled,
          p.priority,
          p.tier,
          p.created_at,
          COUNT(pe.id) AS total_evaluations,
          COUNT(*) FILTER (WHERE pe.result = 'allow') AS allowed,
          COUNT(*) FILTER (WHERE pe.result = 'deny') AS denied,
          COUNT(*) FILTER (WHERE pe.result = 'require_approval') AS escalated,
          MAX(pe.evaluated_at) AS last_evaluated
        FROM policies p
        LEFT JOIN policy_evaluations pe ON pe.rule_id = p.id
          AND pe.evaluated_at > NOW() - ${interval}
          AND pe.tenant_id = $1
        WHERE p.tenant_id = $1
        GROUP BY p.id
        ORDER BY total_evaluations DESC
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Agent performance detail ────────────────────────────────────
    if (req.method === 'GET' && path === '/agents') {
      const result = await pool.query(`
        SELECT
          ar.agent_id,
          ar.display_name,
          ar.status,
          ar.trust_score,
          ar.registered_at,
          ar.last_heartbeat,
          COUNT(DISTINCT ele.execution_id) AS executions,
          COUNT(DISTINCT w.id) AS warrants
        FROM agent_registry ar
        LEFT JOIN execution_ledger_events ele ON ele.actor_id = ar.agent_id 
          AND ele.tenant_id = $1
          AND ele.event_timestamp > NOW() - ${interval}
        LEFT JOIN warrants w ON w.agent_id = ar.agent_id AND w.tenant_id = $1
        WHERE ar.tenant_id = $1
        GROUP BY ar.agent_id, ar.display_name, ar.status, ar.trust_score, ar.registered_at, ar.last_heartbeat
        ORDER BY executions DESC
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Risk Heatmap (agent × tier action counts) ──────────────────
    if (req.method === 'GET' && path === '/risk-heatmap') {
      const result = await pool.query(`
        SELECT
          ar.agent_id,
          ar.display_name AS agent_name,
          ar.status,
          COALESCE(SUM(CASE WHEN ele.risk_tier = 'T0' THEN 1 ELSE 0 END), 0) AS t0_count,
          COALESCE(SUM(CASE WHEN ele.risk_tier = 'T1' THEN 1 ELSE 0 END), 0) AS t1_count,
          COALESCE(SUM(CASE WHEN ele.risk_tier = 'T2' THEN 1 ELSE 0 END), 0) AS t2_count,
          COALESCE(SUM(CASE WHEN ele.risk_tier = 'T3' THEN 1 ELSE 0 END), 0) AS t3_count,
          COALESCE(SUM(CASE WHEN ele.risk_tier IN ('T2', 'T3') THEN 1 ELSE 0 END), 0) AS high_risk_count,
          COUNT(DISTINCT ele.execution_id) AS total_actions
        FROM agent_registry ar
        LEFT JOIN execution_ledger_events ele ON ele.actor_id = ar.agent_id
          AND ele.tenant_id = $1
          AND ele.event_timestamp > NOW() - ${interval}
          AND ele.event_type = 'execution_started'
        WHERE ar.tenant_id = $1
        GROUP BY ar.agent_id, ar.display_name, ar.status
        HAVING COUNT(DISTINCT ele.execution_id) > 0
        ORDER BY high_risk_count DESC, total_actions DESC
      `, [tenantId]);

      return res.json({
        success: true,
        data: result.rows,
        timeRange: range,
        generatedAt: new Date().toISOString(),
      });
    }

    // ── Trend comparison (current vs previous period) ───────────────
    if (req.method === 'GET' && path === '/trends') {
      const [current, previous] = await Promise.all([
        pool.query(`
          SELECT
            COUNT(DISTINCT execution_id) AS executions,
            COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
            COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
        `, [tenantId]),
        pool.query(`
          SELECT
            COUNT(DISTINCT execution_id) AS executions,
            COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
            COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected
          FROM execution_ledger_events
          WHERE tenant_id = $1 
            AND event_timestamp BETWEEN NOW() - (2 * ${interval}) AND NOW() - ${interval}
        `, [tenantId]),
      ]);

      const cur = current.rows[0];
      const prev = previous.rows[0];
      const pctChange = (c, p) => p > 0 ? Math.round(100 * (c - p) / p) : c > 0 ? 100 : 0;

      return res.json({
        success: true,
        data: {
          current: cur,
          previous: prev,
          changes: {
            executions: pctChange(parseInt(cur.executions), parseInt(prev.executions)),
            completed: pctChange(parseInt(cur.completed), parseInt(prev.completed)),
            rejected: pctChange(parseInt(cur.rejected), parseInt(prev.rejected)),
          },
          timeRange: range,
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[analytics]', error);
    captureException(error, { endpoint: 'analytics', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'ANALYTICS_ERROR' });
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
  return map[range] || "INTERVAL '30 days'";
}
