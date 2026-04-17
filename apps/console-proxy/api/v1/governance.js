/**
 * Governance Chain API — Full Intent→Policy→Warrant→Execution Lineage
 * Traces the complete governance lifecycle for any entity in the chain.
 * TENANT-ISOLATED: All queries filter by tenant_id
 * 
 * Schema reference (regulator.*):
 *   intents: id, tenant_id, agent_id, action, status, created_at
 *   policy_evaluations: id, rule_id, intent_id, agent_id, result, conditions_checked, evaluated_at
 *   warrants: id, intent_id, agent_id, risk_tier, status, created_at
 *   approval_requests: approval_id, intent_id, required_tier, status, created_at, updated_at
 *   execution_ledger_events: event_id, execution_id, warrant_id, event_type, actor_id, event_timestamp
 *   audit_log: id, event_type, actor, details, created_at
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/governance/, '');
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── Full governance chain for an entity ──────────────────────────
    if (req.method === 'GET' && path.startsWith('/chain/')) {
      const entityId = path.replace('/chain/', '');
      const entityType = params.type || 'auto';

      const chain = await buildGovernanceChain(tenantId, entityId, entityType);
      return res.json({ success: true, data: chain });
    }

    // ── Live governance overview (control tower view) ───────────────
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const range = params.range || '24h';
      const interval = timeRangeToInterval(range);

      const [
        chainStats,
        recentChains,
        policyViolations,
        warrantStatus,
        escalationPaths,
      ] = await Promise.all([
        // Chain completion stats
        pool.query(`
          SELECT
            COUNT(*) AS total_intents,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed_chains,
            COUNT(*) FILTER (WHERE status = 'rejected' OR status = 'denied') AS rejected_chains,
            COUNT(*) FILTER (WHERE status = 'pending' OR status = 'awaiting_approval') AS pending_chains
          FROM intents
          WHERE tenant_id::text = $1::text AND created_at > NOW() - ${interval}
        `, [tenantId]),

        // Recent governance chains (last 15) — aggregated with subqueries
        pool.query(`
          SELECT 
            i.id AS intent_id,
            i.action AS action_type,
            i.agent_id,
            i.status AS intent_status,
            i.created_at,
            (SELECT json_agg(json_build_object(
              'id', pe.id,
              'rule_id', pe.rule_id,
              'result', pe.result,
              'evaluated_at', pe.evaluated_at
            ) ORDER BY pe.evaluated_at)
            FROM policy_evaluations pe WHERE pe.intent_id::text = i.id::text AND pe.tenant_id::text = $1::text
            ) AS evaluations,
            (SELECT json_agg(json_build_object(
              'id', w.id,
              'status', w.status,
              'risk_tier', w.risk_tier,
              'created_at', w.created_at
            ) ORDER BY w.created_at)
            FROM warrants w WHERE w.intent_id::text = i.id::text AND w.tenant_id::text = $1::text
            ) AS warrants,
            (SELECT json_agg(json_build_object(
              'execution_id', e.execution_id,
              'event_type', e.event_type,
              'timestamp', e.event_timestamp
            ) ORDER BY e.event_timestamp DESC)
            FROM execution_ledger_events e 
            WHERE e.warrant_id IN (SELECT w2.id FROM warrants w2 WHERE w2.intent_id::text = i.id::text AND w2.tenant_id::text = $1::text)
              AND e.tenant_id::text = $1::text
            ) AS executions
          FROM intents i
          WHERE i.tenant_id::text = $1::text AND i.created_at > NOW() - ${interval}
          ORDER BY i.created_at DESC
          LIMIT 15
        `, [tenantId]),

        // Policy violations (denied + reasons)
        pool.query(`
          SELECT 
            pe.rule_id AS policy_id,
            p.name AS policy_name,
            pe.result,
            pe.intent_id,
            pe.conditions_checked,
            pe.evaluated_at,
            i.action AS action_type,
            i.agent_id
          FROM policy_evaluations pe
          LEFT JOIN policies p ON p.id = pe.rule_id
          LEFT JOIN intents i ON i.id = pe.intent_id
          WHERE pe.tenant_id::text = $1::text 
            AND pe.result = 'deny'
            AND pe.evaluated_at > NOW() - ${interval}
          ORDER BY pe.evaluated_at DESC
          LIMIT 20
        `, [tenantId]),

        // Warrant status breakdown
        pool.query(`
          SELECT
            status,
            risk_tier,
            COUNT(*) AS count,
            MAX(created_at) AS most_recent
          FROM warrants
          WHERE tenant_id::text = $1::text
          GROUP BY status, risk_tier
          ORDER BY count DESC
        `, [tenantId]),

        // Escalation paths (approvals by tier)
        pool.query(`
          SELECT
            required_tier AS tier,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved,
            COUNT(*) FILTER (WHERE status = 'denied') AS denied,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'expired') AS expired,
            AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) 
              FILTER (WHERE status IN ('approved', 'denied')) AS avg_resolution_seconds
          FROM approval_requests
          WHERE tenant_id::text = $1::text AND created_at > NOW() - ${interval}
          GROUP BY required_tier
          ORDER BY required_tier
        `, [tenantId]),
      ]);

      return res.json({
        success: true,
        data: {
          chainStats: chainStats.rows[0],
          recentChains: recentChains.rows,
          policyViolations: policyViolations.rows,
          warrantStatus: warrantStatus.rows,
          escalationPaths: escalationPaths.rows,
          timeRange: range,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // ── Search governance entities ──────────────────────────────────
    if (req.method === 'GET' && path === '/search') {
      const q = params.q || '';
      const type = params.type;
      const limit = Math.min(parseInt(params.limit || '20', 10), 50);

      if (!q && !type) {
        return res.status(400).json({ success: false, error: 'Provide q or type parameter' });
      }

      const results = [];

      if (!type || type === 'intent') {
        const r = await pool.query(`
          SELECT 'intent' AS entity_type, id, action AS action_type, agent_id, status, created_at
          FROM intents
          WHERE tenant_id::text = $1::text AND (
            id::text ILIKE $2 OR action ILIKE $2 OR agent_id ILIKE $2
          )
          ORDER BY created_at DESC LIMIT $3
        `, [tenantId, `%${q}%`, limit]);
        results.push(...r.rows);
      }

      if (!type || type === 'warrant') {
        const r = await pool.query(`
          SELECT 'warrant' AS entity_type, id, agent_id, status, risk_tier, created_at
          FROM warrants
          WHERE tenant_id::text = $1::text AND (
            id::text ILIKE $2 OR agent_id ILIKE $2 OR status ILIKE $2
          )
          ORDER BY created_at DESC LIMIT $3
        `, [tenantId, `%${q}%`, limit]);
        results.push(...r.rows);
      }

      if (!type || type === 'execution') {
        const r = await pool.query(`
          SELECT DISTINCT ON (execution_id) 
            'execution' AS entity_type, execution_id AS id, event AS status, 
            actor_id AS agent_id, event_timestamp AS created_at
          FROM execution_ledger_events
          WHERE tenant_id::text = $1::text AND (
            execution_id::text ILIKE $2 OR actor_id ILIKE $2
          )
          ORDER BY execution_id, event_timestamp DESC
          LIMIT $3
        `, [tenantId, `%${q}%`, limit]);
        results.push(...r.rows);
      }

      if (!type || type === 'agent') {
        const r = await pool.query(`
          SELECT 'agent' AS entity_type, agent_id AS id, display_name, status, 
            trust_score, last_heartbeat AS created_at
          FROM agent_registry
          WHERE tenant_id::text = $1::text AND (
            agent_id ILIKE $2 OR display_name ILIKE $2
          )
          ORDER BY last_heartbeat DESC NULLS LAST LIMIT $3
        `, [tenantId, `%${q}%`, limit]);
        results.push(...r.rows);
      }

      return res.json({ success: true, data: results });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[governance]', error);
    captureException(error, { endpoint: 'governance', tenantId });
    return res.status(500).json({ success: false, error: error.message, code: 'GOVERNANCE_ERROR' });
  }
};

// ── Build complete governance chain from any entity ──────────────
async function buildGovernanceChain(tenantId, entityId, entityType) {
  const chain = {
    intent: null,
    policyEvaluations: [],
    warrants: [],
    approvals: [],
    executions: [],
    auditTrail: [],
  };

  let intentId = entityId;

  // Trace back to intent if starting from warrant or execution
  if (entityType === 'warrant' || entityType === 'auto') {
    const w = await pool.query(
      'SELECT intent_id FROM warrants WHERE id = $1 AND tenant_id = $2',
      [entityId, tenantId]
    );
    if (w.rows.length > 0 && w.rows[0].intent_id) {
      intentId = w.rows[0].intent_id;
    }
  }
  if (entityType === 'execution' || (entityType === 'auto' && intentId === entityId)) {
    const e = await pool.query(
      `SELECT w.intent_id FROM execution_ledger_events ele 
       JOIN warrants w ON w.id = ele.warrant_id AND w.tenant_id = $2
       WHERE ele.execution_id = $1 AND ele.tenant_id = $2 AND w.intent_id IS NOT NULL
       LIMIT 1`,
      [entityId, tenantId]
    );
    if (e.rows.length > 0 && e.rows[0].intent_id) {
      intentId = e.rows[0].intent_id;
    }
  }

  // Fetch intent
  const intentResult = await pool.query(
    'SELECT * FROM intents WHERE id = $1 AND tenant_id = $2',
    [intentId, tenantId]
  );
  if (intentResult.rows.length > 0) {
    chain.intent = intentResult.rows[0];
  }

  // Fetch policy evaluations
  const evalResult = await pool.query(
    `SELECT pe.*, p.name AS policy_name 
     FROM policy_evaluations pe 
     LEFT JOIN policies p ON p.id = pe.rule_id
     WHERE pe.intent_id = $1 AND pe.tenant_id = $2
     ORDER BY pe.evaluated_at ASC`,
    [intentId, tenantId]
  );
  chain.policyEvaluations = evalResult.rows;

  // Fetch warrants
  const warrantResult = await pool.query(
    'SELECT * FROM warrants WHERE intent_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
    [intentId, tenantId]
  );
  chain.warrants = warrantResult.rows;

  // Fetch approvals
  const approvalResult = await pool.query(
    'SELECT * FROM approval_requests WHERE intent_id = $1 AND tenant_id = $2 ORDER BY created_at ASC',
    [intentId, tenantId]
  );
  chain.approvals = approvalResult.rows;

  // Fetch execution events (via warrant linkage)
  const warrantIds = chain.warrants.map(w => w.id);
  if (warrantIds.length > 0) {
    const execResult = await pool.query(
      `SELECT * FROM execution_ledger_events 
       WHERE warrant_id = ANY($1) AND tenant_id = $2
       ORDER BY event_timestamp ASC`,
      [warrantIds, tenantId]
    );
    chain.executions = execResult.rows;
  }

  // Fetch audit trail
  const auditResult = await pool.query(
    `SELECT * FROM audit_log 
     WHERE tenant_id::text = $1::text AND (
       details->>'intent_id' = $2 
       OR details->>'entity_id' = $2
     )
     ORDER BY created_at ASC
     LIMIT 50`,
    [tenantId, intentId]
  );
  chain.auditTrail = auditResult.rows;

  return chain;
}

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
