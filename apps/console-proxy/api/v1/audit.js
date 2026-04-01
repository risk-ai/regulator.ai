/**
 * Audit Export API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { trackUsage } = require('../../lib/usage');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/audit/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    const format = queryParams.format || 'json';
    const limit = parseInt(queryParams.limit || '1000');

    // Recent audit log (used by dashboard)
    if (path === '/recent' || path === '' || path === '/') {
      const recentLimit = parseInt(queryParams.limit || '50');
      const [events, countResult] = await Promise.all([
        pool.query('SELECT * FROM regulator.audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2', [tenantId, recentLimit]),
        pool.query('SELECT count(*)::int as total FROM regulator.audit_log WHERE tenant_id = $1', [tenantId]),
      ]);
      return res.json({
        success: true,
        data: {
          entries: events.rows.map(e => ({
            id: e.id,
            type: (e.event || '').includes('warrant') ? 'warrant' : (e.event || '').includes('policy') ? 'policy' : (e.event || '').includes('intent') ? 'intent' : 'execution',
            action: e.event || 'Unknown',
            event: e.event,
            actor: e.actor || 'system',
            risk_tier: e.risk_tier,
            status: 'success',
            timestamp: e.created_at,
            proposal_id: e.proposal_id,
            warrant_id: e.warrant_id,
            tenant_id: e.tenant_id,
            details: typeof e.details === 'object' ? JSON.stringify(e.details) : (e.details || ''),
          })),
          total: parseInt(countResult.rows[0]?.total || 0),
        }
      });
    }

    // Audit executions
    if (path === '/executions') {
      const result = await pool.query(
        `SELECT * FROM execution_ledger_events
         WHERE tenant_id = $1
         ORDER BY event_timestamp DESC
         LIMIT $2`,
        [tenantId, limit]
      );
      
      // Track audit query usage
      trackUsage(tenantId, 'audit_queries');
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_executions.csv');
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Audit approvals
    if (path === '/approvals') {
      const result = await pool.query(
        `SELECT * FROM approval_requests
         WHERE tenant_id = $1
         ORDER BY requested_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );
      
      // Track audit query usage
      trackUsage(tenantId, 'audit_queries');
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_approvals.csv');
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Audit warrants
    if (path === '/warrants') {
      const result = await pool.query(
        `SELECT 
          execution_id,
          event_timestamp as issued_at,
          payload
        FROM execution_ledger_events
        WHERE tenant_id = $1 AND event_type = 'warrant_issued'
        ORDER BY event_timestamp DESC
        LIMIT $2`,
        [tenantId, limit]
      );
      
      // Track audit query usage
      trackUsage(tenantId, 'audit_queries');
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_warrants.csv');
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found. Use /executions, /approvals, or /warrants'
    });
    
  } catch (error) {
    console.error('[audit]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'AUDIT_ERROR'
    });
  }
};

function convertToCSV(rows) {
  if (rows.length === 0) return '';
  
  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}
