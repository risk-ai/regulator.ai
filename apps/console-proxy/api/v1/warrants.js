/**
 * Warrant Verification API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { notifyWarrantIssued, notifyWarrantExpired } = require('../../lib/notifications');
const { trackUsage } = require('../../lib/usage');
const { captureException } = require('../../lib/sentry');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/warrants/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // List warrants
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const limit = parseInt(queryParams.limit || '50');
      
      const result = await pool.query(
        `SELECT w.id, w.proposal_id, w.signature, w.expires_at, w.revoked, 
                w.revoked_at, w.revoked_reason, w.issued_by, w.created_at, w.tenant_id,
                p.action, p.agent_id, p.risk_tier as proposal_risk
         FROM regulator.warrants w 
         LEFT JOIN regulator.proposals p ON w.proposal_id = p.id
         WHERE w.tenant_id = $1
         ORDER BY w.created_at DESC
         LIMIT $2`,
        [tenantId, limit]
      );
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Verify warrant
    if (req.method === 'POST' && path.includes('/verify')) {
      const { warrant_id, signature } = req.body;
      
      if (!warrant_id) {
        return res.status(400).json({
          success: false,
          error: 'warrant_id required'
        });
      }
      
      const result = await pool.query(
        `SELECT * FROM execution_ledger_events
         WHERE execution_id = $1 
           AND tenant_id = $2
           AND event_type = 'warrant_issued'`,
        [warrant_id, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: {
            valid: false,
            reason: 'Warrant not found'
          }
        });
      }
      
      const warrant = result.rows[0];
      const storedSignature = warrant.payload?.signature;
      
      // Check if expired (1 hour TTL)
      const issuedAt = new Date(warrant.event_timestamp);
      const now = new Date();
      const expired = (now - issuedAt) > (60 * 60 * 1000);
      
      if (expired) {
        return res.json({
          success: true,
          data: {
            valid: false,
            reason: 'Warrant expired'
          }
        });
      }
      
      // Verify signature if provided
      if (signature && signature !== storedSignature) {
        return res.json({
          success: true,
          data: {
            valid: false,
            reason: 'Invalid signature'
          }
        });
      }
      
      // Track warrant verification usage
      trackUsage(tenantId, 'warrants_issued');

      return res.json({
        success: true,
        data: {
          valid: true,
          warrant_id,
          issued_at: issuedAt.toISOString(),
          expires_at: new Date(issuedAt.getTime() + 60 * 60 * 1000).toISOString()
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[warrants]', error);
    captureException(error, { endpoint: 'warrants', tenantId });
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'WARRANT_ERROR'
    });
  }
};
