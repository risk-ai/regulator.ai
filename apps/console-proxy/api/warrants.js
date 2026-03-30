/**
 * Warrant Management & Verification API
 * Handle warrant issuance, verification, and queries
 */

const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Generate HMAC signature for warrant
function generateWarrantSignature(warrant, secret = process.env.WARRANT_SECRET || 'vienna-warrant-secret') {
  const payload = JSON.stringify({
    warrant_id: warrant.warrant_id,
    execution_id: warrant.execution_id,
    tier: warrant.tier,
    issued_at: warrant.issued_at,
    expires_at: warrant.expires_at
  });
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

module.exports = async function handler(req, res) {
  const path = req.url.replace(/^\/api\/v1\/warrants/, '');
  
  try {
    // Verify warrant signature
    if (req.method === 'POST' && path === '/verify') {
      const { warrant_id, signature } = req.body;
      
      if (!warrant_id || !signature) {
        return res.status(400).json({
          success: false,
          error: 'warrant_id and signature required'
        });
      }
      
      // Get warrant from ledger
      const result = await pool.query(
        `SELECT 
          event_id as warrant_id,
          execution_id,
          event_timestamp as issued_at
        FROM public.execution_ledger_events
        WHERE event_id = $1 AND event_type = 'warrant_issued'`,
        [warrant_id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Warrant not found',
          valid: false
        });
      }
      
      const warrant = result.rows[0];
      
      // Calculate expected signature
      const expectedSignature = generateWarrantSignature(warrant);
      const valid = signature === expectedSignature;
      
      // Check expiry (warrants valid for tier-specific duration)
      const issuedAt = new Date(warrant.issued_at);
      const now = new Date();
      const ageMinutes = (now - issuedAt) / (1000 * 60);
      const expired = ageMinutes > 60; // Default 60 min
      
      return res.json({
        success: true,
        data: {
          warrant_id,
          valid,
          expired,
          issued_at: warrant.issued_at,
          age_minutes: Math.floor(ageMinutes),
          execution_id: warrant.execution_id
        }
      });
    }
    
    // Get warrant details
    if (req.method === 'GET' && path.startsWith('/')) {
      const warrantId = path.substring(1);
      
      if (!warrantId) {
        return res.status(400).json({
          success: false,
          error: 'Warrant ID required'
        });
      }
      
      // Get warrant and associated execution
      const result = await pool.query(
        `SELECT 
          w.event_id as warrant_id,
          w.execution_id,
          w.event_timestamp as issued_at,
          a.approval_id,
          a.required_tier,
          a.status as approval_status,
          a.reviewed_by,
          a.reviewed_at
        FROM public.execution_ledger_events w
        LEFT JOIN public.approval_requests a ON a.execution_id = w.execution_id
        WHERE w.event_id = $1 AND w.event_type = 'warrant_issued'`,
        [warrantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Warrant not found'
        });
      }
      
      const warrant = result.rows[0];
      
      // Generate signature for verification
      const signature = generateWarrantSignature(warrant);
      
      // Get full audit trail for this execution
      const audit = await pool.query(
        `SELECT event_type, stage, event_timestamp
         FROM public.execution_ledger_events
         WHERE execution_id = $1
         ORDER BY event_timestamp ASC`,
        [warrant.execution_id]
      );
      
      return res.json({
        success: true,
        data: {
          ...warrant,
          signature,
          audit_trail: audit.rows
        }
      });
    }
    
    // List warrants with filters
    if (req.method === 'GET' && (!path || path === '/')) {
      const { execution_id, limit = 50 } = req.query;
      
      let query = `
        SELECT 
          event_id as warrant_id,
          execution_id,
          event_timestamp as issued_at
        FROM public.execution_ledger_events
        WHERE event_type = 'warrant_issued'
      `;
      const params = [];
      
      if (execution_id) {
        params.push(execution_id);
        query += ` AND execution_id = $${params.length}`;
      }
      
      query += ` ORDER BY event_timestamp DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit, 10));
      
      const result = await pool.query(query, params);
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[warrants]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'WARRANT_ERROR'
    });
  }
};
