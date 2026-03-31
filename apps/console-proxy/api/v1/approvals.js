/**
 * Approval Management API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { notifyApprovalGranted, notifyApprovalDenied } = require('../../lib/notifications');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/approvals/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // List approvals
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = queryParams.status || 'pending';
      const tier = queryParams.tier;
      
      let query = `
        SELECT * FROM public.approval_requests
        WHERE tenant_id = $1 AND status = $2
      `;
      const values = [tenantId, status];
      
      if (tier) {
        values.push(tier);
        query += ` AND required_tier = $${values.length}`;
      }
      
      query += ` ORDER BY requested_at DESC LIMIT 100`;
      
      const result = await pool.query(query, values);
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get specific approval
    if (req.method === 'GET' && path.startsWith('/')) {
      const approvalId = path.substring(1).split('/')[0];
      
      const result = await pool.query(
        `SELECT * FROM public.approval_requests 
         WHERE approval_id = $1 AND tenant_id = $2`,
        [approvalId, tenantId]
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
    if (req.method === 'POST' && path.includes('/approve')) {
      const approvalId = path.split('/')[1];
      const { reviewer, notes } = req.body;
      
      if (!reviewer) {
        return res.status(400).json({
          success: false,
          error: 'reviewer required'
        });
      }
      
      const result = await pool.query(
        `UPDATE public.approval_requests 
         SET status = 'approved', 
             reviewed_by = $1, 
             reviewed_at = NOW(),
             reviewer_notes = $2
         WHERE approval_id = $3 AND tenant_id = $4 AND status = 'pending'
         RETURNING *`,
        [reviewer, notes || '', approvalId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Approval not found or already processed'
        });
      }

      // Create notification for approval granted
      try {
        await notifyApprovalGranted(tenantId, {
          approvalId,
          reviewer,
          userId: result.rows[0].requested_by // Notify the requester
        });
      } catch (notificationError) {
        console.error('[approvals] Failed to create approval granted notification:', notificationError);
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }
    
    // Reject action
    if (req.method === 'POST' && path.includes('/reject')) {
      const approvalId = path.split('/')[1];
      const { reviewer, reason } = req.body;
      
      if (!reviewer || !reason) {
        return res.status(400).json({
          success: false,
          error: 'reviewer and reason required'
        });
      }
      
      const result = await pool.query(
        `UPDATE public.approval_requests 
         SET status = 'rejected', 
             reviewed_by = $1, 
             reviewed_at = NOW(),
             reviewer_notes = $2
         WHERE approval_id = $3 AND tenant_id = $4 AND status = 'pending'
         RETURNING *`,
        [reviewer, reason, approvalId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Approval not found or already processed'
        });
      }

      // Create notification for approval denied
      try {
        await notifyApprovalDenied(tenantId, {
          approvalId,
          reviewer,
          reason,
          userId: result.rows[0].requested_by // Notify the requester
        });
      } catch (notificationError) {
        console.error('[approvals] Failed to create approval denied notification:', notificationError);
      }
      
      return res.json({
        success: true,
        data: result.rows[0]
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
