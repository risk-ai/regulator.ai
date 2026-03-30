/**
 * Execution Records API
 * Materialized view of execution ledger events
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/execution-records/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // List execution records
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const status = queryParams.status;
      const tier = queryParams.tier;
      const limit = parseInt(queryParams.limit || '100');
      const offset = parseInt(queryParams.offset || '0');
      
      // Materialize from ledger events if summary is empty
      await materializeExecutionRecords(tenantId);
      
      let query = `
        SELECT 
          execution_id,
          tenant_id,
          risk_tier,
          objective,
          current_stage,
          execution_status,
          approval_required,
          approval_status,
          started_at,
          completed_at,
          duration_ms,
          event_count
        FROM execution_ledger_summary
        WHERE tenant_id = $1
      `;
      const values = [tenantId];
      
      if (status) {
        values.push(status);
        query += ` AND execution_status = $${values.length}`;
      }
      
      if (tier) {
        values.push(tier);
        query += ` AND risk_tier = $${values.length}`;
      }
      
      query += ` ORDER BY started_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);
      
      const result = await pool.query(query, values);
      
      return res.json({
        success: true,
        data: result.rows,
        total: result.rowCount
      });
    }
    
    // Get specific execution record
    if (req.method === 'GET' && path.startsWith('/')) {
      const executionId = path.substring(1);
      
      const result = await pool.query(
        `SELECT * FROM execution_ledger_summary 
         WHERE execution_id = $1 AND tenant_id = $2`,
        [executionId, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution record not found'
        });
      }
      
      // Get full event history
      const events = await pool.query(
        `SELECT * FROM execution_ledger_events
         WHERE execution_id = $1 AND tenant_id = $2
         ORDER BY event_timestamp ASC`,
        [executionId, tenantId]
      );
      
      return res.json({
        success: true,
        data: {
          ...result.rows[0],
          events: events.rows
        }
      });
    }
    
    // Refresh/materialize records
    if (req.method === 'POST' && path === '/refresh') {
      const count = await materializeExecutionRecords(tenantId);
      
      return res.json({
        success: true,
        data: {
          records_created: count,
          message: 'Execution records refreshed'
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[execution-records]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXECUTION_RECORDS_ERROR'
    });
  }
};

/**
 * Materialize execution records from ledger events
 * Creates summary records for all executions in the ledger
 */
async function materializeExecutionRecords(tenantId) {
  try {
    // Get all distinct execution IDs for this tenant
    const executions = await pool.query(
      `SELECT DISTINCT execution_id 
       FROM execution_ledger_events 
       WHERE tenant_id = $1 
         AND execution_id NOT IN (
           SELECT execution_id FROM execution_ledger_summary WHERE tenant_id = $1
         )`,
      [tenantId]
    );
    
    if (executions.rows.length === 0) {
      return 0; // No new executions to materialize
    }
    
    let count = 0;
    
    for (const { execution_id } of executions.rows) {
      // Get all events for this execution
      const events = await pool.query(
        `SELECT * FROM execution_ledger_events 
         WHERE execution_id = $1 AND tenant_id = $2
         ORDER BY event_timestamp ASC`,
        [execution_id, tenantId]
      );
      
      if (events.rows.length === 0) continue;
      
      const firstEvent = events.rows[0];
      const lastEvent = events.rows[events.rows.length - 1];
      
      // Extract data from events
      const riskTier = firstEvent.payload?.tier || firstEvent.payload?.risk_tier || 'T0';
      const objective = firstEvent.payload?.action || firstEvent.payload?.objective || 'unknown';
      const actorId = firstEvent.payload?.agent_id || firstEvent.payload?.actor_id;
      
      // Determine status from events
      const hasCompleted = events.rows.some(e => e.event_type === 'execution_completed');
      const hasRejected = events.rows.some(e => e.event_type === 'execution_rejected');
      const hasFailed = events.rows.some(e => e.event_type === 'execution_failed');
      const requiresApproval = events.rows.some(e => e.event_type === 'approval_required');
      
      let executionStatus = 'pending';
      if (hasCompleted) executionStatus = 'completed';
      else if (hasRejected) executionStatus = 'rejected';
      else if (hasFailed) executionStatus = 'failed';
      else if (requiresApproval) executionStatus = 'pending_approval';
      
      const approvalStatus = requiresApproval ? 'pending' : 'not_required';
      
      // Calculate duration
      const startedAt = new Date(firstEvent.event_timestamp);
      const completedAt = hasCompleted || hasRejected || hasFailed 
        ? new Date(lastEvent.event_timestamp) 
        : null;
      const durationMs = completedAt ? (completedAt - startedAt) : null;
      
      // Insert summary record
      await pool.query(
        `INSERT INTO execution_ledger_summary (
          execution_id, tenant_id, risk_tier, objective, actor_id,
          current_stage, execution_status, approval_required, approval_status,
          started_at, completed_at, duration_ms, event_count,
          last_event_type, last_event_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (execution_id) DO NOTHING`,
        [
          execution_id,
          tenantId,
          riskTier,
          objective,
          actorId,
          lastEvent.stage || 'unknown',
          executionStatus,
          requiresApproval,
          approvalStatus,
          startedAt,
          completedAt,
          durationMs,
          events.rows.length,
          lastEvent.event_type,
          lastEvent.event_timestamp
        ]
      );
      
      count++;
    }
    
    return count;
  } catch (error) {
    console.error('[materialize]', error);
    throw error;
  }
}
