/**
 * Stats & Metrics API
 * Aggregated statistics for dashboard
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/stats/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  
  try {
    // Overall stats
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const period = queryParams.period || '30d'; // 24h, 7d, 30d, all
      
      let timeFilter = '';
      if (period === '24h') {
        timeFilter = "AND event_timestamp > NOW() - INTERVAL '24 hours'";
      } else if (period === '7d') {
        timeFilter = "AND event_timestamp > NOW() - INTERVAL '7 days'";
      } else if (period === '30d') {
        timeFilter = "AND event_timestamp > NOW() - INTERVAL '30 days'";
      }
      
      // Execution stats
      const executions = await pool.query(
        `SELECT 
          COUNT(DISTINCT execution_id) as total_executions,
          COUNT(CASE WHEN event_type = 'execution_completed' THEN 1 END) as completed,
          COUNT(CASE WHEN event_type = 'execution_rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN event_type = 'execution_failed' THEN 1 END) as failed,
          COUNT(CASE WHEN event_type = 'approval_required' THEN 1 END) as pending_approval
        FROM execution_ledger_events
        WHERE tenant_id = $1 ${timeFilter}`,
        [tenantId]
      );
      
      // Approvals stats
      const approvals = await pool.query(
        `SELECT 
          COUNT(*) as total_approvals,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          AVG(EXTRACT(EPOCH FROM (reviewed_at - requested_at))) as avg_approval_time_seconds
        FROM approval_requests
        WHERE tenant_id = $1`,
        [tenantId]
      );
      
      // Policy stats
      const policies = await pool.query(
        `SELECT 
          COUNT(*) as total_policies,
          COUNT(CASE WHEN enabled = 1 THEN 1 END) as enabled,
          COUNT(CASE WHEN tier = 'T0' THEN 1 END) as tier_t0,
          COUNT(CASE WHEN tier = 'T1' THEN 1 END) as tier_t1,
          COUNT(CASE WHEN tier = 'T2' THEN 1 END) as tier_t2,
          COUNT(CASE WHEN tier = 'T3' THEN 1 END) as tier_t3
        FROM policies
        WHERE tenant_id = $1`,
        [tenantId]
      );
      
      // Agent stats
      const agents = await pool.query(
        `SELECT 
          COUNT(*) as total_agents,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN default_tier = 'T0' THEN 1 END) as low_risk,
          COUNT(CASE WHEN default_tier IN ('T1', 'T2', 'T3') THEN 1 END) as high_risk
        FROM agents
        WHERE tenant_id = $1`,
        [tenantId]
      );
      
      // Warrant stats
      const warrants = await pool.query(
        `SELECT 
          COUNT(*) as total_warrants,
          COUNT(CASE WHEN event_timestamp > NOW() - INTERVAL '1 hour' THEN 1 END) as active,
          COUNT(CASE WHEN event_timestamp <= NOW() - INTERVAL '1 hour' THEN 1 END) as expired
        FROM execution_ledger_events
        WHERE tenant_id = $1 AND event_type = 'warrant_issued'`,
        [tenantId]
      );
      
      return res.json({
        success: true,
        data: {
          period,
          executions: executions.rows[0],
          approvals: approvals.rows[0],
          policies: policies.rows[0],
          agents: agents.rows[0],
          warrants: warrants.rows[0],
          generated_at: new Date().toISOString()
        }
      });
    }
    
    // Execution trends (time series)
    if (req.method === 'GET' && path === '/executions/trends') {
      const days = parseInt(queryParams.days || '7');
      
      const result = await pool.query(
        `SELECT 
          DATE(event_timestamp) as date,
          COUNT(DISTINCT execution_id) as executions,
          COUNT(CASE WHEN event_type = 'execution_completed' THEN 1 END) as completed,
          COUNT(CASE WHEN event_type = 'execution_rejected' THEN 1 END) as rejected
        FROM execution_ledger_events
        WHERE tenant_id = $1 
          AND event_timestamp > NOW() - INTERVAL '${days} days'
        GROUP BY DATE(event_timestamp)
        ORDER BY date DESC`,
        [tenantId]
      );
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Approval trends
    if (req.method === 'GET' && path === '/approvals/trends') {
      const days = parseInt(queryParams.days || '7');
      
      const result = await pool.query(
        `SELECT 
          DATE(requested_at) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          AVG(EXTRACT(EPOCH FROM (reviewed_at - requested_at))) as avg_time_seconds
        FROM approval_requests
        WHERE tenant_id = $1 
          AND requested_at > NOW() - INTERVAL '${days} days'
        GROUP BY DATE(requested_at)
        ORDER BY date DESC`,
        [tenantId]
      );
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    // Risk tier distribution
    if (req.method === 'GET' && path === '/risk-distribution') {
      const result = await pool.query(
        `SELECT 
          payload->>'tier' as tier,
          COUNT(DISTINCT execution_id) as count
        FROM execution_ledger_events
        WHERE tenant_id = $1 
          AND event_type = 'execution_requested'
        GROUP BY payload->>'tier'
        ORDER BY tier`,
        [tenantId]
      );
      
      return res.json({
        success: true,
        data: result.rows
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found. Available: /, /executions/trends, /approvals/trends, /risk-distribution'
    });
    
  } catch (error) {
    console.error('[stats]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'STATS_ERROR'
    });
  }
};
