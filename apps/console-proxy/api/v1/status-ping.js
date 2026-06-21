/**
 * Status Ping — Health monitoring endpoint for status page
 *
 * GET  /api/v1/status        — current status + 24h uptime stats
 * POST /api/v1/status/ping   — record a health ping (called by Vercel cron)
 *
 * The POST endpoint is protected by CRON_SECRET (Vercel cron auth header).
 * The GET endpoint is public (no auth required).
 */

const { pool } = require('../../../database/client');
const { captureException } = require('../../../lib/sentry');

const SERVICES = [
  {
    key: 'api',
    name: 'Console API',
    url: 'https://console.regulator.ai/api/v1/health',
  },
  {
    key: 'console',
    name: 'Vienna OS Console',
    url: 'https://console.regulator.ai',
  },
  {
    key: 'marketing',
    name: 'Marketing Site',
    url: 'https://regulator.ai',
  },
];

/**
 * Ping a service and return status + latency
 */
async function pingService(service) {
  const start = Date.now();
  try {
    const res = await fetch(service.url, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    return {
      key: service.key,
      name: service.name,
      status: res.ok ? 'healthy' : 'degraded',
      latencyMs,
      statusCode: res.status,
      error: null,
    };
  } catch (err) {
    return {
      key: service.key,
      name: service.name,
      status: 'down',
      latencyMs: null,
      statusCode: null,
      error: err.message || 'Connection failed',
    };
  }
}

/**
 * Record ping results in health_pings table
 */
async function recordPings(results) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of results) {
      await client.query(
        `INSERT INTO regulator.health_pings (service, status, latency_ms, status_code, error, pinged_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [r.key, r.status, r.latencyMs, r.statusCode, r.error]
      );
    }
    // Cleanup: delete pings older than 30 days
    await client.query(
      `DELETE FROM regulator.health_pings WHERE pinged_at < NOW() - INTERVAL '30 days'`
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Calculate uptime percentage for each service over last 24 hours
 */
async function getUptimeStats() {
  try {
    const result = await pool.query(
      `SELECT
         service,
         COUNT(*) AS total_pings,
         COUNT(*) FILTER (WHERE status = 'healthy') AS healthy_pings,
         AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
         MAX(pinged_at) AS last_pinged_at
       FROM regulator.health_pings
       WHERE pinged_at > NOW() - INTERVAL '24 hours'
       GROUP BY service`
    );

    const stats = {};
    for (const row of result.rows) {
      const total = parseInt(row.total_pings, 10);
      const healthy = parseInt(row.healthy_pings, 10);
      stats[row.service] = {
        uptime_pct: total > 0 ? Math.round((healthy / total) * 10000) / 100 : null,
        avg_latency_ms: row.avg_latency_ms ? Math.round(row.avg_latency_ms) : null,
        total_pings: total,
        last_pinged_at: row.last_pinged_at,
      };
    }
    return stats;
  } catch {
    return {};
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/status/, '') || '/';

  // ── GET /api/v1/status — public status endpoint ──────────────────
  if (req.method === 'GET' && (path === '/' || path === '')) {
    try {
      const [checks, uptime] = await Promise.all([
        Promise.all(SERVICES.map(pingService)),
        getUptimeStats(),
      ]);

      const allHealthy = checks.every(c => c.status === 'healthy');
      const anyDown = checks.some(c => c.status === 'down');

      return res.json({
        success: true,
        data: {
          overall: anyDown ? 'down' : allHealthy ? 'operational' : 'degraded',
          services: checks.map(c => ({
            ...c,
            uptime_pct: uptime[c.key]?.uptime_pct ?? null,
            avg_latency_ms: uptime[c.key]?.avg_latency_ms ?? c.latencyMs,
            last_pinged_at: uptime[c.key]?.last_pinged_at ?? new Date().toISOString(),
          })),
          checked_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      captureException(error, { tags: { endpoint: 'status-ping' } });
      console.error('[status-ping] GET error:', error);
      return res.status(500).json({ success: false, error: 'Failed to check status' });
    }
  }

  // ── POST /api/v1/status/ping — Vercel cron endpoint ──────────────
  if (req.method === 'POST' && path === '/ping') {
    // Verify Vercel cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'];
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const results = await Promise.all(SERVICES.map(pingService));
      await recordPings(results);

      return res.json({
        success: true,
        data: {
          pinged: results.length,
          results: results.map(r => ({ service: r.key, status: r.status, latencyMs: r.latencyMs })),
          pinged_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      captureException(error, { tags: { endpoint: 'status-ping-cron' } });
      console.error('[status-ping] POST error:', error);
      return res.status(500).json({ success: false, error: 'Ping failed' });
    }
  }

  return res.status(404).json({ success: false, error: 'Not found' });
};
