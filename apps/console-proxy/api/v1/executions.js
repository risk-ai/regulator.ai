/**
 * Execution History API — Premium Control Tower
 * Rich querying, filtering, stats, timeline, and warrant chain details.
 * TENANT-ISOLATED: All queries filter by tenant_id
 *
 * Schema: execution_ledger_events (event_id, tenant_id, execution_id, plan_id,
 *   verification_id, warrant_id, outcome_id, event_type, stage, actor_type,
 *   actor_id, environment, risk_tier, objective, target_type, target_id,
 *   event_timestamp, sequence_num, status, payload_json, evidence_json, summary, created_at)
 */

const { requireAuth, pool } = require('./_auth');
const { trackUsage } = require('../../lib/usage');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/executions/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── List executions (rich filtering) ────────────────────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = params.status;
      const agent = params.agent || params.actor_id;
      const riskTier = params.risk_tier || params.tier;
      const search = params.q || params.search;
      const range = params.range;
      const sortBy = params.sort || 'timestamp';
      const sortDir = params.dir === 'asc' ? 'ASC' : 'DESC';
      const limit = Math.min(parseInt(params.limit || '50', 10), 200);
      const offset = parseInt(params.offset || '0', 10);

      // Build the latest-event-per-execution query
      let query = `
        WITH latest_events AS (
          SELECT DISTINCT ON (execution_id)
            execution_id,
            event_type,
            stage,
            actor_id,
            actor_type,
            environment,
            risk_tier,
            objective,
            target_type,
            target_id,
            warrant_id,
            plan_id,
            event_timestamp,
            summary,
            status,
            payload_json
          FROM execution_ledger_events
          WHERE tenant_id = $1
      `;
      const values = [tenantId];
      let paramIdx = 2;

      if (status) {
        query += ` AND event_type = $${paramIdx}`;
        values.push(status);
        paramIdx++;
      }
      if (agent) {
        query += ` AND actor_id = $${paramIdx}`;
        values.push(agent);
        paramIdx++;
      }
      if (riskTier) {
        query += ` AND risk_tier = $${paramIdx}`;
        values.push(riskTier);
        paramIdx++;
      }
      if (range) {
        const interval = timeRangeToInterval(range);
        query += ` AND event_timestamp > NOW() - ${interval}`;
      }
      if (search) {
        query += ` AND (objective ILIKE $${paramIdx} OR summary ILIKE $${paramIdx} OR execution_id::text ILIKE $${paramIdx} OR actor_id ILIKE $${paramIdx})`;
        values.push(`%${search}%`);
        paramIdx++;
      }

      query += `
          ORDER BY execution_id, event_timestamp DESC
        )
        SELECT * FROM latest_events
        ORDER BY event_timestamp ${sortDir}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;
      values.push(limit, offset);

      const result = await pool.query(query, values);

      // Get total count (without pagination)
      let countQuery = `
        SELECT COUNT(DISTINCT execution_id) AS total
        FROM execution_ledger_events WHERE tenant_id = $1
      `;
      const countValues = [tenantId];
      let countIdx = 2;
      if (status) {
        countQuery += ` AND event_type = $${countIdx}`;
        countValues.push(status);
        countIdx++;
      }
      if (agent) {
        countQuery += ` AND actor_id = $${countIdx}`;
        countValues.push(agent);
        countIdx++;
      }
      if (riskTier) {
        countQuery += ` AND risk_tier = $${countIdx}`;
        countValues.push(riskTier);
        countIdx++;
      }
      if (range) {
        countQuery += ` AND event_timestamp > NOW() - ${timeRangeToInterval(range)}`;
      }

      const countResult = await pool.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total, 10);

      trackUsage(tenantId, 'policy_evaluations');

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + result.rows.length < total,
        },
      });
    }

    // ── Execution stats (overview counters) ─────────────────────────
    if (req.method === 'GET' && path === '/stats') {
      const range = params.range;
      const interval = range ? timeRangeToInterval(range) : null;
      const timeFilter = interval ? `AND event_timestamp > NOW() - ${interval}` : '';

      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT execution_id) AS total_executions,
          COUNT(*) FILTER (WHERE event_type = 'execution_completed') AS completed,
          COUNT(*) FILTER (WHERE event_type = 'execution_rejected') AS rejected,
          COUNT(*) FILTER (WHERE event_type = 'approval_required') AS pending_approval,
          COUNT(*) FILTER (WHERE event_type = 'execution_started') AS in_progress,
          COUNT(DISTINCT actor_id) AS unique_agents,
          COUNT(DISTINCT warrant_id) FILTER (WHERE warrant_id IS NOT NULL) AS warrants_used
        FROM execution_ledger_events
        WHERE tenant_id = $1 ${timeFilter}
      `, [tenantId]);

      return res.json({ success: true, data: result.rows[0] });
    }

    // ── Execution timeline (for sparklines/charts) ──────────────────
    if (req.method === 'GET' && path === '/timeline') {
      const range = params.range || '24h';
      const interval = timeRangeToInterval(range);
      const bucket = ['1h', '6h', '24h'].includes(range) ? "'hour'" : "'day'";

      const result = await pool.query(`
        SELECT
          date_trunc(${bucket}, event_timestamp) AS bucket,
          COUNT(DISTINCT execution_id) AS total,
          COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_completed') AS completed,
          COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'execution_rejected') AS rejected,
          COUNT(DISTINCT execution_id) FILTER (WHERE event_type = 'approval_required') AS escalated,
          COUNT(DISTINCT actor_id) AS active_agents
        FROM execution_ledger_events
        WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
        GROUP BY bucket
        ORDER BY bucket ASC
      `, [tenantId]);

      return res.json({ success: true, data: result.rows });
    }

    // ── Status breakdown (for donut/pie charts) ─────────────────────
    if (req.method === 'GET' && path === '/breakdown') {
      const range = params.range || '30d';
      const interval = timeRangeToInterval(range);

      const [byStatus, byAgent, byRisk, byEnvironment] = await Promise.all([
        pool.query(`
          SELECT event_type AS status, COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
          GROUP BY event_type ORDER BY count DESC
        `, [tenantId]),

        pool.query(`
          SELECT actor_id AS agent, COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval} AND actor_id IS NOT NULL
          GROUP BY actor_id ORDER BY count DESC LIMIT 10
        `, [tenantId]),

        pool.query(`
          SELECT COALESCE(risk_tier::text, 'unclassified') AS risk_tier, COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
          GROUP BY risk_tier ORDER BY count DESC
        `, [tenantId]),

        pool.query(`
          SELECT COALESCE(environment, 'unknown') AS environment, COUNT(DISTINCT execution_id) AS count
          FROM execution_ledger_events
          WHERE tenant_id = $1 AND event_timestamp > NOW() - ${interval}
          GROUP BY environment ORDER BY count DESC
        `, [tenantId]),
      ]);

      return res.json({
        success: true,
        data: {
          byStatus: byStatus.rows,
          byAgent: byAgent.rows,
          byRisk: byRisk.rows,
          byEnvironment: byEnvironment.rows,
        },
      });
    }

    // ── Get specific execution (full event chain) ───────────────────
    if (req.method === 'GET' && path.match(/^\/[^/]+$/) && !path.includes('/stats')) {
      const executionId = path.substring(1);

      // Get all events for this execution
      const events = await pool.query(
        `SELECT * FROM execution_ledger_events
         WHERE execution_id = $1 AND tenant_id = $2
         ORDER BY event_timestamp ASC`,
        [executionId, tenantId]
      );

      if (events.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Execution not found' });
      }

      // Get related warrant details
      const warrantIds = [...new Set(events.rows.map(e => e.warrant_id).filter(Boolean))];
      let warrants = [];
      if (warrantIds.length > 0) {
        const wr = await pool.query(
          'SELECT * FROM warrants WHERE id = ANY($1) AND tenant_id = $2',
          [warrantIds, tenantId]
        );
        warrants = wr.rows;
      }

      // Get related approval requests
      const approvals = await pool.query(
        `SELECT * FROM approval_requests
         WHERE execution_id = $1 AND tenant_id = $2
         ORDER BY created_at ASC`,
        [executionId, tenantId]
      );

      // Get agent info
      const actorIds = [...new Set(events.rows.map(e => e.actor_id).filter(Boolean))];
      let agents = [];
      if (actorIds.length > 0) {
        const ar = await pool.query(
          'SELECT agent_id, display_name, status, trust_score FROM agent_registry WHERE agent_id = ANY($1) AND tenant_id = $2',
          [actorIds, tenantId]
        );
        agents = ar.rows;
      }

      return res.json({
        success: true,
        data: {
          execution_id: executionId,
          events: events.rows,
          warrants,
          approvals: approvals.rows,
          agents,
          summary: {
            total_events: events.rows.length,
            started_at: events.rows[0]?.event_timestamp,
            latest_event: events.rows[events.rows.length - 1]?.event_timestamp,
            current_status: events.rows[events.rows.length - 1]?.event_type,
            risk_tier: events.rows[0]?.risk_tier,
            objective: events.rows[0]?.objective,
          },
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[executions]', error);
    captureException(error, { endpoint: 'executions', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'EXECUTION_ERROR' });
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
