/**
 * Execution History & Monitoring API
 * Query execution history with filtering and audit trails
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/executions/, '');
  const params = Object.fromEntries(url.searchParams);
  
  try {
    // Get specific execution details with full audit trail
    if (req.method === 'GET' && path.startsWith('/') && path.length > 1) {
      const executionId = path.substring(1);
      
      // Get all events for this execution
      const events = await pool.query(
        `SELECT 
          event_id,
          event_type,
          stage,
          event_timestamp,
          sequence_num
        FROM public.execution_ledger_events
        WHERE execution_id = $1
        ORDER BY sequence_num ASC, event_timestamp ASC`,
        [executionId]
      );
      
      if (events.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }
      
      // Get approval request if any
      const approval = await pool.query(
        `SELECT 
          approval_id,
          required_tier,
          status,
          action_summary,
          risk_summary,
          requested_at,
          reviewed_by,
          reviewed_at,
          reviewer_notes
        FROM public.approval_requests
        WHERE execution_id = $1`,
        [executionId]
      );
      
      // Determine execution status
      const hasWarrant = events.rows.some(e => e.event_type === 'warrant_issued');
      const isRejected = events.rows.some(e => e.event_type === 'execution_rejected');
      const isApproved = events.rows.some(e => e.event_type === 'execution_approved');
      const isCompleted = events.rows.some(e => e.event_type === 'execution_completed');
      
      let status = 'unknown';
      if (isRejected) status = 'rejected';
      else if (isCompleted) status = 'completed';
      else if (isApproved) status = 'approved';
      else if (approval.rows.length > 0 && approval.rows[0].status === 'pending') status = 'pending_approval';
      else status = 'in_progress';
      
      return res.json({
        success: true,
        data: {
          execution_id: executionId,
          status,
          has_warrant: hasWarrant,
          approval: approval.rows[0] || null,
          audit_trail: events.rows,
          started_at: events.rows[0].event_timestamp,
          updated_at: events.rows[events.rows.length - 1].event_timestamp
        }
      });
    }
    
    // List executions with filters
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const tier = params.tier;
      const status = params.status;
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const from_date = params.from_date;
      const to_date = params.to_date;
      
      let query = `
        WITH execution_summary AS (
          SELECT DISTINCT ON (e.execution_id)
            e.execution_id,
            e.event_timestamp as started_at,
            a.required_tier,
            a.status as approval_status,
            a.action_summary,
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM execution_ledger_events 
                WHERE execution_id = e.execution_id 
                AND event_type = 'execution_rejected'
              ) THEN 'rejected'
              WHEN EXISTS (
                SELECT 1 FROM execution_ledger_events 
                WHERE execution_id = e.execution_id 
                AND event_type = 'execution_completed'
              ) THEN 'completed'
              WHEN a.status = 'pending' THEN 'pending_approval'
              ELSE 'in_progress'
            END as status,
            EXISTS (
              SELECT 1 FROM execution_ledger_events 
              WHERE execution_id = e.execution_id 
              AND event_type = 'warrant_issued'
            ) as has_warrant
          FROM execution_ledger_events e
          LEFT JOIN approval_requests a ON a.execution_id = e.execution_id
          WHERE e.event_type = 'execution_requested'
      `;
      
      const params = [];
      
      if (tier) {
        params.push(tier);
        query += ` AND a.required_tier = $${params.length}`;
      }
      
      if (from_date) {
        params.push(from_date);
        query += ` AND e.event_timestamp >= $${params.length}`;
      }
      
      if (to_date) {
        params.push(to_date);
        query += ` AND e.event_timestamp <= $${params.length}`;
      }
      
      query += `
          ORDER BY e.execution_id, e.event_timestamp DESC
        )
        SELECT * FROM execution_summary
      `;
      
      if (status) {
        params.push(status);
        query += ` WHERE status = $${params.length}`;
      }
      
      query += ` ORDER BY started_at DESC`;
      
      params.push(parseInt(limit, 10));
      query += ` LIMIT $${params.length}`;
      
      params.push(parseInt(offset, 10));
      query += ` OFFSET $${params.length}`;
      
      const result = await pool.query(query, params);
      
      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(DISTINCT execution_id) as total 
         FROM execution_ledger_events 
         WHERE event_type = 'execution_requested'`
      );
      
      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total, 10),
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10)
        }
      });
    }
    
    // Get execution statistics
    if (req.method === 'GET' && path === '/stats') {
      const stats = await pool.query(`
        SELECT 
          COUNT(DISTINCT e.execution_id) as total_executions,
          COUNT(DISTINCT CASE WHEN w.event_id IS NOT NULL THEN e.execution_id END) as with_warrant,
          COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN e.execution_id END) as pending_approval,
          COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN e.execution_id END) as approved,
          COUNT(DISTINCT CASE WHEN a.status = 'rejected' THEN e.execution_id END) as rejected,
          COUNT(DISTINCT CASE WHEN completed.event_id IS NOT NULL THEN e.execution_id END) as completed
        FROM execution_ledger_events e
        LEFT JOIN execution_ledger_events w ON w.execution_id = e.execution_id AND w.event_type = 'warrant_issued'
        LEFT JOIN execution_ledger_events completed ON completed.execution_id = e.execution_id AND completed.event_type = 'execution_completed'
        LEFT JOIN approval_requests a ON a.execution_id = e.execution_id
        WHERE e.event_type = 'execution_requested'
      `);
      
      return res.json({
        success: true,
        data: stats.rows[0]
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[executions]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXECUTION_ERROR'
    });
  }
};
