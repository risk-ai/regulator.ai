/**
 * Usage API
 * Provides current usage, history, and limits for metered billing
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth } = require('./_auth');
const { getCurrentUsage, getUsageLimits, getUsageHistory, checkUsageLimits, getCurrentPeriod } = require('../../lib/usage');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/usage/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  // Auth required for all usage endpoints
  const user = await requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // GET /api/v1/usage — current period usage summary
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const [usage, limits, warnings] = await Promise.all([
        getCurrentUsage(tenantId),
        getUsageLimits(tenantId),
        checkUsageLimits(tenantId)
      ]);
      
      const period = getCurrentPeriod();
      
      // Build summary with limits and percentages
      const summary = {};
      for (const [metric, count] of Object.entries(usage)) {
        const limit = limits[metric];
        summary[metric] = {
          current: count,
          limit: limit?.limit || null,
          percentage: limit?.limit ? Math.round((count / limit.limit) * 100) : null,
          overage_rate_cents: limit?.overageRate || 0
        };
      }
      
      // Add metrics with limits but no usage
      for (const [metric, limit] of Object.entries(limits)) {
        if (!summary[metric]) {
          summary[metric] = {
            current: 0,
            limit: limit.limit,
            percentage: 0,
            overage_rate_cents: limit.overageRate || 0
          };
        }
      }
      
      return res.json({
        success: true,
        data: {
          period: {
            start: period.start,
            end: period.end
          },
          usage: summary,
          warnings: warnings,
          total_metrics: Object.keys(summary).length
        }
      });
    }
    
    // GET /api/v1/usage/history — historical usage
    if (req.method === 'GET' && path === '/history') {
      const months = parseInt(queryParams.months || '6');
      const history = await getUsageHistory(tenantId, months);
      
      // Group by period for easier consumption
      const groupedHistory = {};
      history.forEach(row => {
        const periodKey = `${row.period_start}_${row.period_end}`;
        if (!groupedHistory[periodKey]) {
          groupedHistory[periodKey] = {
            period_start: row.period_start,
            period_end: row.period_end,
            metrics: {}
          };
        }
        groupedHistory[periodKey].metrics[row.metric] = parseInt(row.total_count);
      });
      
      const periods = Object.values(groupedHistory).sort((a, b) => 
        new Date(b.period_start) - new Date(a.period_start)
      );
      
      return res.json({
        success: true,
        data: {
          periods,
          months_requested: months,
          total_periods: periods.length
        }
      });
    }
    
    // GET /api/v1/usage/limits — current limits and % used
    if (req.method === 'GET' && path === '/limits') {
      const [usage, limits] = await Promise.all([
        getCurrentUsage(tenantId),
        getUsageLimits(tenantId)
      ]);
      
      const limitSummary = {};
      for (const [metric, limit] of Object.entries(limits)) {
        const currentUsage = usage[metric] || 0;
        limitSummary[metric] = {
          limit: limit.limit,
          current_usage: currentUsage,
          percentage_used: Math.round((currentUsage / limit.limit) * 100),
          overage_rate_cents: limit.overageRate || 0,
          remaining: Math.max(0, limit.limit - currentUsage)
        };
      }
      
      return res.json({
        success: true,
        data: limitSummary
      });
    }
    
    // POST /api/v1/usage/limits — set/update limits (admin only)
    if (req.method === 'POST' && path === '/limits') {
      const { metric, monthly_limit, overage_rate_cents = 0 } = req.body;
      
      if (!metric || !monthly_limit || monthly_limit < 0) {
        return res.status(400).json({
          success: false,
          error: 'metric and monthly_limit (>= 0) required'
        });
      }
      
      const { query } = require('../../database/client');
      
      // Use INSERT ... ON CONFLICT for upsert
      await query(
        `INSERT INTO usage_limits (tenant_id, metric, monthly_limit, overage_rate_cents)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, metric) 
         DO UPDATE SET 
           monthly_limit = EXCLUDED.monthly_limit,
           overage_rate_cents = EXCLUDED.overage_rate_cents`,
        [tenantId, metric, monthly_limit, overage_rate_cents]
      );
      
      return res.json({
        success: true,
        data: {
          metric,
          monthly_limit,
          overage_rate_cents
        }
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found. Use /, /history, or /limits'
    });
    
  } catch (error) {
    console.error('[usage]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'USAGE_ERROR'
    });
  }
};