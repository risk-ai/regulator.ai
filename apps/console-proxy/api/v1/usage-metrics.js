/**
 * Usage Metrics API — Real-Time Usage Dashboard
 * 
 * Provides usage statistics for proposals, warrants, API calls, and agents.
 * Used for usage dashboard and upgrade funnel.
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const params = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    const range = params.range || '30d';
    const daysAgo = range === '7d' ? 7 : range === '30d' ? 30 : 90;

    // Get current usage
    const [todayMetrics, monthMetrics, agentStats, trendData] = await Promise.all([
      // Today's metrics
      pool.query(`
        SELECT
          COUNT(DISTINCT id) FILTER (WHERE created_at::date = CURRENT_DATE) AS proposals_today,
          COUNT(DISTINCT id) FILTER (WHERE created_at::date = CURRENT_DATE AND id IN (
            SELECT DISTINCT intent_id FROM warrants WHERE tenant_id = $1
          )) AS warrants_today
        FROM intents
        WHERE tenant_id = $1
      `, [tenantId]),

      // Month metrics
      pool.query(`
        SELECT
          COUNT(DISTINCT id) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS proposals_month,
          COUNT(DISTINCT id) FILTER (WHERE created_at > NOW() - INTERVAL '30 days' AND id IN (
            SELECT DISTINCT intent_id FROM warrants WHERE tenant_id = $1
          )) AS warrants_month
        FROM intents
        WHERE tenant_id = $1
      `, [tenantId]),

      // Agent stats
      pool.query(`
        SELECT
          COUNT(*) AS total_agents,
          COUNT(*) FILTER (WHERE status = 'active') AS active_agents
        FROM agent_registry
        WHERE tenant_id = $1
      `, [tenantId]),

      // Trend data (daily buckets)
      pool.query(`
        SELECT
          DATE(created_at) AS date,
          COUNT(*) AS proposals,
          COUNT(*) FILTER (WHERE id IN (
            SELECT DISTINCT intent_id FROM warrants WHERE tenant_id = $1
          )) AS warrants,
          0 AS api_calls
        FROM intents
        WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '${daysAgo} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [tenantId]),
    ]);

    const today = todayMetrics.rows[0] || {};
    const month = monthMetrics.rows[0] || {};
    const agents = agentStats.rows[0] || {};

    // Get plan limits (mock for now - would come from billing table)
    const planLimits = {
      proposals_per_month: 1000, // Team plan default
      agents_max: 10,
      api_calls_per_month: 50000,
    };

    // Calculate API calls (simplified - would track actual API usage)
    const apiCallsToday = Math.floor(parseInt(today.proposals_today || 0) * 5); // Estimate: 5 calls per proposal
    const apiCallsMonth = Math.floor(parseInt(month.proposals_month || 0) * 5);

    return res.json({
      success: true,
      data: {
        proposals_today: parseInt(today.proposals_today || 0),
        proposals_this_month: parseInt(month.proposals_month || 0),
        warrants_issued_today: parseInt(today.warrants_today || 0),
        warrants_issued_this_month: parseInt(month.warrants_month || 0),
        api_calls_today: apiCallsToday,
        api_calls_this_month: apiCallsMonth,
        agents_active: parseInt(agents.active_agents || 0),
        agents_total: parseInt(agents.total_agents || 0),
        plan_limits: planLimits,
        trend_data: trendData.rows,
      },
    });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'usage-metrics' } });
    console.error('Usage metrics error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
