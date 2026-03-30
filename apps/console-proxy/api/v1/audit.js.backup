/**
 * Audit Export API
 * Export audit trails in various formats (JSON, CSV)
 */

const { requireAuth } = require('./_auth');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

function convertToCSV(data, columns) {
  const header = columns.join(',');
  const rows = data.map(row => 
    columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/audit/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // Export execution audit trail
    if (path === '/executions' || path === '/executions/export') {
      const format = params.format || 'json';
      const from_date = params.from_date;
      const to_date = params.to_date;
      const tier = params.tier;
      
      let query = `
        SELECT 
          e.event_id,
          e.execution_id,
          e.event_type,
          e.stage,
          e.event_timestamp,
          a.approval_id,
          a.required_tier,
          a.status as approval_status,
          a.action_summary,
          a.reviewed_by,
          a.reviewed_at
        FROM execution_ledger_events e
        LEFT JOIN approval_requests a ON a.execution_id = e.execution_id
        WHERE 1=1
      `;
      
      const queryParams = [];
      
      if (from_date) {
        queryParams.push(from_date);
        query += ` AND e.event_timestamp >= $${queryParams.length}`;
      }
      
      if (to_date) {
        queryParams.push(to_date);
        query += ` AND e.event_timestamp <= $${queryParams.length}`;
      }
      
      if (tier) {
        queryParams.push(tier);
        query += ` AND a.required_tier = $${queryParams.length}`;
      }
      
      query += ' ORDER BY e.event_timestamp DESC LIMIT 10000';
      
      const result = await pool.query(query, queryParams);
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows, [
          'event_id', 'execution_id', 'event_type', 'stage', 'event_timestamp',
          'approval_id', 'required_tier', 'approval_status', 'action_summary',
          'reviewed_by', 'reviewed_at'
        ]);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_executions_${Date.now()}.csv"`);
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        format: 'json',
        count: result.rows.length,
        data: result.rows
      });
    }
    
    // Export approval audit trail
    if (path === '/approvals' || path === '/approvals/export') {
      const format = params.format || 'json';
      const status = params.status;
      const from_date = params.from_date;
      const to_date = params.to_date;
      
      let query = `
        SELECT 
          approval_id,
          execution_id,
          plan_id,
          required_tier,
          status,
          action_summary,
          risk_summary,
          requested_at,
          requested_by,
          reviewed_by,
          reviewed_at,
          reviewer_notes
        FROM approval_requests
        WHERE 1=1
      `;
      
      const queryParams = [];
      
      if (status) {
        queryParams.push(status);
        query += ` AND status = $${queryParams.length}`;
      }
      
      if (from_date) {
        queryParams.push(from_date);
        query += ` AND requested_at >= $${queryParams.length}`;
      }
      
      if (to_date) {
        queryParams.push(to_date);
        query += ` AND requested_at <= $${queryParams.length}`;
      }
      
      query += ' ORDER BY requested_at DESC LIMIT 10000';
      
      const result = await pool.query(query, queryParams);
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows, [
          'approval_id', 'execution_id', 'required_tier', 'status',
          'action_summary', 'risk_summary', 'requested_at', 'requested_by',
          'reviewed_by', 'reviewed_at', 'reviewer_notes'
        ]);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_approvals_${Date.now()}.csv"`);
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        format: 'json',
        count: result.rows.length,
        data: result.rows
      });
    }
    
    // Export warrant audit trail
    if (path === '/warrants' || path === '/warrants/export') {
      const format = params.format || 'json';
      const from_date = params.from_date;
      const to_date = params.to_date;
      
      let query = `
        SELECT 
          event_id as warrant_id,
          execution_id,
          event_timestamp as issued_at
        FROM execution_ledger_events
        WHERE event_type = 'warrant_issued'
      `;
      
      const queryParams = [];
      
      if (from_date) {
        queryParams.push(from_date);
        query += ` AND event_timestamp >= $${queryParams.length}`;
      }
      
      if (to_date) {
        queryParams.push(to_date);
        query += ` AND event_timestamp <= $${queryParams.length}`;
      }
      
      query += ' ORDER BY event_timestamp DESC LIMIT 10000';
      
      const result = await pool.query(query, queryParams);
      
      if (format === 'csv') {
        const csv = convertToCSV(result.rows, ['warrant_id', 'execution_id', 'issued_at']);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_warrants_${Date.now()}.csv"`);
        return res.send(csv);
      }
      
      return res.json({
        success: true,
        format: 'json',
        count: result.rows.length,
        data: result.rows
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found. Available: /executions, /approvals, /warrants'
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
