/**
 * Usage Tracking Middleware
 * Handles metered billing for Vienna OS
 */

const { query } = require("../database/client");

// Current period helpers
function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

/**
 * Track usage for a tenant and metric
 * @param {string} tenantId - Tenant UUID
 * @param {string} metric - Metric name (api_calls, warrants_issued, etc.)
 * @param {number} count - Usage count (default: 1)
 */
async function trackUsage(tenantId, metric, count = 1) {
  try {
    const period = getCurrentPeriod();
    
    // Insert usage record (fire and forget - don't block the request)
    setImmediate(async () => {
      try {
        await query(
          `INSERT INTO usage_records (tenant_id, metric, count, period_start, period_end)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, metric, count, period.start, period.end]
        );
        
        // Report to Stripe if configured
        await reportToStripe(tenantId, metric, count);
      } catch (error) {
        // Don't fail the main request if usage tracking fails
        console.error('[Usage] Failed to track:', { tenantId, metric, count, error: error.message });
      }
    });
  } catch (error) {
    console.error('[Usage] Track usage error:', error.message);
    // Don't throw - usage tracking should never break the main flow
  }
}

/**
 * Get current period usage for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {string} metric - Optional specific metric
 */
async function getCurrentUsage(tenantId, metric = null) {
  try {
    const period = getCurrentPeriod();
    
    let sql = `
      SELECT 
        metric,
        SUM(count) as total_count
      FROM usage_records 
      WHERE tenant_id = $1 
        AND period_start = $2 
        AND period_end = $3
    `;
    const params = [tenantId, period.start, period.end];
    
    if (metric) {
      sql += ` AND metric = $4`;
      params.push(metric);
    }
    
    sql += ` GROUP BY metric ORDER BY metric`;
    
    const result = await query(sql, params);
    
    if (metric) {
      return result.rows[0]?.total_count || 0;
    }
    
    // Return object with all metrics
    const usage = {};
    result.rows.forEach(row => {
      usage[row.metric] = parseInt(row.total_count);
    });
    
    return usage;
  } catch (error) {
    console.error('[Usage] Get current usage error:', error.message);
    return metric ? 0 : {};
  }
}

/**
 * Get usage limits for a tenant
 * @param {string} tenantId - Tenant UUID
 */
async function getUsageLimits(tenantId) {
  try {
    const result = await query(
      `SELECT metric, monthly_limit, overage_rate_cents
       FROM usage_limits 
       WHERE tenant_id = $1`,
      [tenantId]
    );
    
    const limits = {};
    result.rows.forEach(row => {
      limits[row.metric] = {
        limit: row.monthly_limit,
        overageRate: row.overage_rate_cents
      };
    });
    
    return limits;
  } catch (error) {
    console.error('[Usage] Get limits error:', error.message);
    return {};
  }
}

/**
 * Check if tenant is approaching limits
 * @param {string} tenantId - Tenant UUID
 * @param {number} warningThreshold - Warning at % of limit (default: 80%)
 */
async function checkUsageLimits(tenantId, warningThreshold = 0.8) {
  try {
    const [usage, limits] = await Promise.all([
      getCurrentUsage(tenantId),
      getUsageLimits(tenantId)
    ]);
    
    const warnings = [];
    
    for (const [metric, currentUsage] of Object.entries(usage)) {
      const limit = limits[metric];
      if (limit && limit.limit > 0) {
        const percentage = currentUsage / limit.limit;
        
        if (percentage >= 1) {
          warnings.push({
            metric,
            level: 'exceeded',
            current: currentUsage,
            limit: limit.limit,
            percentage: Math.round(percentage * 100)
          });
        } else if (percentage >= warningThreshold) {
          warnings.push({
            metric,
            level: 'warning',
            current: currentUsage,
            limit: limit.limit,
            percentage: Math.round(percentage * 100)
          });
        }
      }
    }
    
    return warnings;
  } catch (error) {
    console.error('[Usage] Check limits error:', error.message);
    return [];
  }
}

/**
 * Get historical usage aggregates
 * @param {string} tenantId - Tenant UUID
 * @param {number} months - Number of months back (default: 6)
 */
async function getUsageHistory(tenantId, months = 6) {
  try {
    const result = await query(
      `SELECT 
         metric,
         period_start,
         period_end,
         SUM(count) as total_count
       FROM usage_records 
       WHERE tenant_id = $1 
         AND period_start >= DATE_TRUNC('month', NOW() - INTERVAL '${months} months')
       GROUP BY metric, period_start, period_end
       ORDER BY period_start DESC, metric`,
      [tenantId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('[Usage] Get history error:', error.message);
    return [];
  }
}

/**
 * Report usage to Stripe (if configured)
 * @param {string} tenantId - Tenant UUID
 * @param {string} metric - Metric name
 * @param {number} count - Usage count
 */
async function reportToStripe(tenantId, metric, count) {
  try {
    // Only report if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return;
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Get tenant's Stripe customer and subscription info
    const tenantResult = await query(
      `SELECT stripe_customer_id, stripe_subscription_id, stripe_subscription_items 
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    
    if (!tenantResult.rows[0]?.stripe_subscription_id) {
      return; // No active subscription
    }
    
    const tenant = tenantResult.rows[0];
    const subscriptionItems = tenant.stripe_subscription_items || {};
    const subscriptionItemId = subscriptionItems[metric];
    
    if (!subscriptionItemId) {
      return; // No metered item for this metric
    }
    
    // Create usage record
    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity: count,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment'
    });
    
    console.log(`[Usage] Reported ${count} ${metric} to Stripe for tenant ${tenantId}`);
  } catch (error) {
    console.error('[Usage] Stripe reporting error:', error.message);
    // Don't throw - this shouldn't break the main flow
  }
}

module.exports = {
  trackUsage,
  getCurrentUsage,
  getUsageLimits,
  checkUsageLimits,
  getUsageHistory,
  getCurrentPeriod
};