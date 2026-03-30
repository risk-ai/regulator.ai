/**
const { requireAuth } = require('./_auth');
 * Approval Management API
 * Handle approval requests for T1/T2/T3 actions
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

module.exports = async function handler(req, res) {
  // Vercel passes the path without the route prefix
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/approvals/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // List all pending approvals
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = params.status || 'pending';
      const tier = params.tier;
      
      let query = `
        SELECT 
          a.*,
          e.event_type,
          e.stage
        FROM public.approval_requests a
        LEFT JOIN public.execution_ledger_events e 
          ON e.execution_id = a.execution_id
        WHERE a.status = $1
      `;
      const params = [status];
      
      if (tier) {
        query += ` AND a.required_tier = $2`;
        params.push(tier);
      }
      
      query += ` ORDER BY a.requested_at DESC LIMIT 100`;
      
      const result = await pool.query(query, params);
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get specific approval details
    if (req.method === 'GET' && path.startsWith('/')) {
      const approvalId = path.substring(1).split('/')[0];
      
      if (!approvalId) {
        return res.status(400).json({
          success: false,
          error: 'Approval ID required'
        });
      }
      
      const result = await pool.query(
        `SELECT 
          a.*,
          jsonb_agg(
            jsonb_build_object(
              'event_type', e.event_type,
              'stage', e.stage,
              'timestamp', e.event_timestamp
            ) ORDER BY e.event_timestamp
          ) as audit_trail
        FROM public.approval_requests a
        LEFT JOIN public.execution_ledger_events e 
          ON e.execution_id = a.execution_id
        WHERE a.approval_id = $1
        GROUP BY a.approval_id`,
        [approvalId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Approval not found'
        });
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // Approve action
    if (req.method === 'POST' && path.endsWith('/approve')) {
      const approvalId = path.split('/')[1];
      const { reviewer_id = 'system', notes } = req.body;
      
      // Get approval details
      const approval = await pool.query(
        'SELECT * FROM public.approval_requests WHERE approval_id = $1',
        [approvalId]
      );
      
      if (approval.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Approval not found'
        });
      }
      
      const request = approval.rows[0];
      
      // Check if already processed
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Approval already ${request.status}`
        });
      }
      
      // Check if expired
      if (new Date(request.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Approval request expired'
        });
      }
      
      // Update approval status
      await pool.query(
        `UPDATE public.approval_requests 
         SET status = 'approved', 
             reviewed_by = $1, 
             reviewed_at = NOW(),
             reviewer_notes = $2
         WHERE approval_id = $3`,
        [reviewer_id, notes, approvalId]
      );
      
      // Issue warrant now that it's approved
      const warrantId = `warrant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await pool.query(
        `INSERT INTO public.execution_ledger_events 
         (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
         VALUES ($1, 'default', $2, 'warrant_issued', 'warrant', 2, NOW())`,
        [warrantId, request.execution_id]
      );
      
      // Log execution
      await pool.query(
        `INSERT INTO public.execution_ledger_events 
         (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
         VALUES ($1, 'default', $2, 'execution_approved', 'execution', 3, NOW())`,
        [request.execution_id + '_approved', request.execution_id]
      );
      
      return res.json({
        success: true,
        data: {
          approval_id: approvalId,
          execution_id: request.execution_id,
          warrant_id: warrantId,
          status: 'approved',
          reviewed_by: reviewer_id
        }
      });
    }
    
    // Reject action
    if (req.method === 'POST' && path.endsWith('/reject')) {
      const approvalId = path.split('/')[1];
      const { reviewer_id = 'system', reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason required'
        });
      }
      
      // Get approval details
      const approval = await pool.query(
        'SELECT * FROM public.approval_requests WHERE approval_id = $1',
        [approvalId]
      );
      
      if (approval.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Approval not found'
        });
      }
      
      const request = approval.rows[0];
      
      // Check if already processed
      if (request.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Approval already ${request.status}`
        });
      }
      
      // Update approval status
      await pool.query(
        `UPDATE public.approval_requests 
         SET status = 'rejected', 
             reviewed_by = $1, 
             reviewed_at = NOW(),
             reviewer_notes = $2
         WHERE approval_id = $3`,
        [reviewer_id, reason, approvalId]
      );
      
      // Log rejection
      await pool.query(
        `INSERT INTO public.execution_ledger_events 
         (event_id, tenant_id, execution_id, event_type, stage, sequence_num, event_timestamp)
         VALUES ($1, 'default', $2, 'execution_rejected', 'execution', 3, NOW())`,
        [request.execution_id + '_rejected', request.execution_id]
      );
      
      return res.json({
        success: true,
        data: {
          approval_id: approvalId,
          execution_id: request.execution_id,
          status: 'rejected',
          reviewed_by: reviewer_id,
          reason
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[approvals]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'APPROVAL_ERROR'
    });
  }
};
