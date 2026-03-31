/**
 * Execution History API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { notifyExecutionFailed } = require('../../lib/notifications');
const { trackUsage } = require('../../lib/usage');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/executions/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // List executions
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = queryParams.status;
      const tier = queryParams.tier;
      const limit = parseInt(queryParams.limit || '100');
      const offset = parseInt(queryParams.offset || '0');
      
      let query = `
        SELECT DISTINCT ON (e.execution_id)
          e.execution_id,
          e.event_type as status,
          e.stage,
          e.event_timestamp as timestamp,
          e.payload
        FROM public.execution_ledger_events e
        WHERE e.tenant_id = $1
      `;
      const values = [tenantId];
      
      if (status) {
        values.push(status);
        query += ` AND e.event_type = $${values.length}`;
      }
      
      query += ` ORDER BY e.execution_id, e.event_timestamp DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      
      // Track policy evaluation usage
      trackUsage(tenantId, 'policy_evaluations');
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Get specific execution
    if (req.method === 'GET' && path.startsWith('/') && !path.includes('/stats')) {
      const executionId = path.substring(1);
      
      const result = await pool.query(
        `SELECT * FROM public.execution_ledger_events 
         WHERE execution_id = $1 AND tenant_id = $2
         ORDER BY event_timestamp ASC`,
        [executionId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }
      
      return res.json({
        success: true,
        data: {
          execution_id: executionId,
          events: result.rows
        }
      });
    }
    
    // Execution stats
    if (req.method === 'GET' && path === '/stats') {
      const result = await pool.query(
        `SELECT 
          COUNT(DISTINCT execution_id) as total_executions,
          COUNT(CASE WHEN event_type = 'execution_completed' THEN 1 END) as completed,
          COUNT(CASE WHEN event_type = 'execution_rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN event_type = 'approval_required' THEN 1 END) as pending_approval
        FROM public.execution_ledger_events
        WHERE tenant_id = $1`,
        [tenantId]
      );
      
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
    console.error('[executions]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXECUTION_ERROR'
    });
  }
};
