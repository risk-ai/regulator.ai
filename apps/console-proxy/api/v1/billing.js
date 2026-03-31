/**
 * Billing & Stripe Customer Portal
 * Handles Stripe customer portal session creation and usage summaries
 */

const { requireAuth } = require('./_auth');
const { query } = require('../../database/client');
const { getCurrentUsage, getUsageLimits, checkUsageLimits, getCurrentPeriod } = require('../../lib/usage');

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/billing/, '');

  // Auth required for all billing endpoints
  const user = await requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;

  try {
    // GET /api/v1/billing — subscription plan + usage summary
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      // Lazy-load Stripe (only when billing endpoint is hit)
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ 
          error: 'Billing not configured',
          message: 'Stripe integration not available.'
        });
      }
      
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      // Get tenant's billing info from database
      const tenantResult = await query(
        `SELECT stripe_customer_id, stripe_subscription_id, stripe_subscription_items, plan_name 
         FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (!tenantResult.rows[0]?.stripe_customer_id) {
        return res.status(404).json({ 
          error: 'No billing account found',
          message: 'Please subscribe to a plan first.'
        });
      }

      const tenant = tenantResult.rows[0];
      
      // Get usage data
      const [usage, limits, warnings] = await Promise.all([
        getCurrentUsage(tenantId),
        getUsageLimits(tenantId),
        checkUsageLimits(tenantId)
      ]);
      
      const period = getCurrentPeriod();
      
      // Build usage summary
      const usageSummary = {};
      for (const [metric, count] of Object.entries(usage)) {
        const limit = limits[metric];
        usageSummary[metric] = {
          current: count,
          limit: limit?.limit || null,
          percentage: limit?.limit ? Math.round((count / limit.limit) * 100) : null
        };
      }
      
      let subscription = null;
      if (tenant.stripe_subscription_id) {
        try {
          subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        } catch (stripeError) {
          console.error('[Billing] Failed to retrieve subscription:', stripeError);
        }
      }
      
      return res.json({
        success: true,
        data: {
          plan: {
            name: tenant.plan_name || 'Free',
            status: subscription?.status || 'active'
          },
          billing_period: {
            start: period.start,
            end: period.end
          },
          usage: usageSummary,
          warnings: warnings,
          subscription: subscription ? {
            id: subscription.id,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString().split('T')[0],
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
          } : null
        }
      });
    }

    // POST /api/v1/billing/portal — create Stripe customer portal session
    if (req.method === 'POST' && (path === '/portal' || path.startsWith('/portal'))) {
      // Lazy-load Stripe (only when billing endpoint is hit)
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ 
          error: 'Billing not configured',
          message: 'Stripe integration not available.'
        });
      }
      
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      // Get tenant's Stripe customer ID from database
      const result = await query(
        `SELECT stripe_customer_id FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (!result.rows[0]?.stripe_customer_id) {
        return res.status(404).json({ 
          error: 'No billing account found',
          message: 'Please subscribe to a plan first.'
        });
      }

      const stripeCustomerId = result.rows[0].stripe_customer_id;

      // Create Stripe customer portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/settings`,
      });

      return res.json({
        success: true,
        data: {
          url: session.url,
          expires_at: new Date(session.created * 1000 + 24 * 60 * 60 * 1000).toISOString(),
        }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Not found. Use GET / for billing summary or POST /portal for customer portal.'
    });

  } catch (error) {
    console.error('[Billing] Error:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid billing request',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      success: false,
      error: 'Billing operation failed',
      message: 'Please try again later.'
    });
  }
};
