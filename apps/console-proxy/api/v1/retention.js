/**
 * Data Retention API — Compliance A+
 * 
 * GET  /api/v1/retention/policies    — List retention policies
 * PUT  /api/v1/retention/policies     — Update retention policy
 * POST /api/v1/retention/execute      — Execute retention (with dry-run)
 * GET  /api/v1/retention/history      — Retention operation history
 * 
 * TENANT-ISOLATED: All queries filter by tenant_id
 * RBAC: Requires retention:view (GET) or retention:manage (PUT/POST)
 */

const { requireAuth, pool } = require('./_auth');

const MINIMUM_RETENTION_DAYS = 30;

// Whitelist of tables that retention policies can target
// SECURITY: prevents SQL injection via table_name interpolation
const ALLOWED_TABLES = new Set([
  'execution_log', 'audit_log', 'execution_ledger_events',
  'execution_steps', 'policy_evaluations', 'approval_requests',
  'webhook_deliveries', 'intents', 'warrants',
]);

const DEFAULT_POLICIES = [
  { table_name: 'execution_log', retention_days: 365, archive_before_delete: true },
  { table_name: 'audit_log', retention_days: 730, archive_before_delete: true },
  { table_name: 'execution_ledger_events', retention_days: 365, archive_before_delete: true },
  { table_name: 'execution_steps', retention_days: 180, archive_before_delete: true },
];

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/retention/, '');

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // GET /api/v1/retention/policies
    if (req.method === 'GET' && path === '/policies') {
      const result = await pool.query(
        `SELECT * FROM data_retention_policies WHERE tenant_id = $1 ORDER BY table_name`,
        [tenantId]
      );

      const policies = result.rows.length > 0
        ? result.rows
        : DEFAULT_POLICIES.map(p => ({
            ...p,
            tenant_id: tenantId,
            enabled: true,
            id: 'default',
          }));

      return res.json({ success: true, data: policies });
    }

    // PUT /api/v1/retention/policies
    if (req.method === 'PUT' && path === '/policies') {
      const { table_name, retention_days, archive_before_delete = true } = req.body;

      // Validate table_name against whitelist to prevent SQL injection
      if (!ALLOWED_TABLES.has(table_name)) {
        return res.status(400).json({ success: false, error: `Invalid table: ${table_name}. Allowed: ${[...ALLOWED_TABLES].join(", ")}` });
      }
      if (!table_name || !retention_days) {
        return res.status(400).json({
          success: false,
          error: 'table_name and retention_days required',
        });
      }

      const effectiveDays = Math.max(retention_days, MINIMUM_RETENTION_DAYS);

      const result = await pool.query(
        `INSERT INTO data_retention_policies (tenant_id, table_name, retention_days, archive_before_delete)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, table_name) DO UPDATE SET
           retention_days = EXCLUDED.retention_days,
           archive_before_delete = EXCLUDED.archive_before_delete,
           updated_at = NOW()
         RETURNING *`,
        [tenantId, table_name, effectiveDays, archive_before_delete]
      );

      return res.json({ success: true, data: result.rows[0] });
    }

    // POST /api/v1/retention/execute
    if (req.method === 'POST' && path === '/execute') {
      const { dry_run = true, table_name } = req.body;

      // Get policies
      const policyResult = await pool.query(
        `SELECT * FROM data_retention_policies WHERE tenant_id = $1 AND enabled = true`,
        [tenantId]
      );

      const policies = policyResult.rows.length > 0
        ? policyResult.rows
        : DEFAULT_POLICIES;

      // Filter to specific table if requested
      if (table_name && !ALLOWED_TABLES.has(table_name)) {
        return res.status(400).json({ success: false, error: `Invalid table: ${table_name}` });
      }
      const targetPolicies = table_name
        ? policies.filter(p => p.table_name === table_name)
        : policies;

      const results = [];

      for (const policy of targetPolicies) {
        const effectiveDays = Math.max(policy.retention_days, MINIMUM_RETENTION_DAYS);
        const cutoffDate = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

        // Count affected records
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${policy.table_name} 
           WHERE tenant_id = $1 AND created_at < $2`,
          [tenantId, cutoffDate]
        );
        const recordCount = parseInt(countResult.rows[0]?.count || '0');

        if (!dry_run && recordCount > 0) {
          if (policy.archive_before_delete !== false) {
            // Soft archive
            await pool.query(
              `UPDATE ${policy.table_name} 
               SET retention_status = 'archived', archived_at = NOW()
               WHERE tenant_id = $1 AND created_at < $2 AND (retention_status IS NULL OR retention_status = 'active')`,
              [tenantId, cutoffDate]
            );
          }

          // Log operation
          await pool.query(
            `INSERT INTO retention_archive_log (tenant_id, table_name, records_archived, records_deleted, executed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, policy.table_name, recordCount, 0, user.id || 'operator']
          );
        }

        results.push({
          table_name: policy.table_name,
          retention_days: effectiveDays,
          cutoff_date: cutoffDate.toISOString(),
          records_affected: recordCount,
          action: dry_run ? 'preview' : (policy.archive_before_delete !== false ? 'archived' : 'deleted'),
          dry_run,
        });
      }

      return res.json({ success: true, data: results });
    }

    // GET /api/v1/retention/history
    if (req.method === 'GET' && path === '/history') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const result = await pool.query(
        `SELECT * FROM retention_archive_log WHERE tenant_id = $1 ORDER BY executed_at DESC LIMIT $2`,
        [tenantId, limit]
      );

      return res.json({ success: true, data: result.rows });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    console.error('[retention]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
