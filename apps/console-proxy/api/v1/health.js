/**
 * Health Check & System Status API
 * Monitor system health, database connectivity, and performance
 */

const cache = require('../../lib/cache');
const { pool } = require('../../database/client');

async function checkDatabase() {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return {
      status: 'healthy',
      latency_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latency_ms: Date.now() - start
    };
  }
}

async function getSystemMetrics() {
  try {
    const [execStats, approvalStats, warrantStats] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM execution_ledger_events'),
      pool.query('SELECT COUNT(*) as total FROM approval_requests'),
      pool.query("SELECT COUNT(*) as total FROM execution_ledger_events WHERE event_type = 'warrant_issued'")
    ]);
    
    return {
      total_executions: parseInt(execStats.rows[0].total),
      total_approvals: parseInt(approvalStats.rows[0].total),
      total_warrants: parseInt(warrantStats.rows[0].total)
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/health/, '');
  
  try {
    // Basic health check
    if (path === '' || path === '/') {
      const db = await checkDatabase();
      
      return res.json({
        success: true,
        status: db.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: {
          database: db,
          cache: {
            status: 'healthy',
            size: cache.stats().size
          }
        }
      });
    }
    
    // Detailed health check
    if (path === '/detailed') {
      const [db, metrics] = await Promise.all([
        checkDatabase(),
        getSystemMetrics()
      ]);
      
      return res.json({
        success: true,
        status: db.status === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime_seconds: process.uptime(),
        memory: {
          used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        checks: {
          database: db,
          cache: cache.stats()
        },
        metrics
      });
    }
    
    // Readiness probe (Kubernetes)
    if (path === '/ready') {
      const db = await checkDatabase();
      
      if (db.status === 'healthy') {
        return res.json({ ready: true });
      } else {
        return res.status(503).json({ ready: false, reason: 'database unhealthy' });
      }
    }
    
    // Liveness probe (Kubernetes)
    if (path === '/live') {
      return res.json({ alive: true });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[health]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'HEALTH_CHECK_ERROR'
    });
  }
};
