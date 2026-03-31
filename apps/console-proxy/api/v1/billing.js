/**
 * Billing & Stripe Integration
 * Handles plans listing, checkout session creation, subscription management,
 * customer portal, and usage summaries.
 */

const { requireAuth } = require('./_auth');
const { query } = require('../../database/client');
const { getCurrentUsage, getUsageLimits, checkUsageLimits, getCurrentPeriod } = require('../../lib/usage');
const crypto = require('crypto');

// Vienna OS Stripe Price IDs (live)
const PLANS = {
  team: {
    name: 'Team',
    price_id: 'price_1TEsu03ZBaXqWjSyTUFuMGm6',
    product_id: 'prod_UDJXGnF4D6fBZK',
    amount: 4900,
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 10 agents',
      '5 active policies',
      '10,000 warrant evaluations/mo',
      'Email support',
      'Standard audit trail',
      'SSE real-time streaming',
    ],
  },
  business: {
    name: 'Business',
    price_id: 'price_1TEsu03ZBaXqWjSyojbaCGJS',
    product_id: 'prod_UDJXLYSIcGgJU3',
    amount: 9900,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited agents',
      'Unlimited policies',
      '100,000 warrant evaluations/mo',
      'Priority support',
      'Advanced audit trail + compliance reports',
      'SSE real-time streaming',
      'Custom policy rules',
      'Multi-tenant support',
      'API key management',
      'Webhook integrations',
    ],
  },
};

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/billing/, '');

  try {
    // ─── GET /api/v1/billing/plans — public, no auth required ───
    if (req.method === 'GET' && path === '/plans') {
      return res.json({
        success: true,
        data: Object.entries(PLANS).map(([key, plan]) => ({
          id: key,
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
        })),
      });
    }

    // ─── All other endpoints require auth ───
    const user = await requireAuth(req, res);
    if (!user) return;
    const tenantId = user.tenant_id;

    // ─── GET /api/v1/billing — subscription plan + usage summary ───
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Billing not configured' });
      }

      const tenantResult = await query(
        `SELECT stripe_customer_id, stripe_subscription_id, stripe_subscription_items, plan_name, plan
         FROM tenants WHERE id = $1`,
        [tenantId]
      );

      const tenant = tenantResult.rows[0];
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Get usage data
      const [usage, limits, warnings] = await Promise.all([
        getCurrentUsage(tenantId),
        getUsageLimits(tenantId),
        checkUsageLimits(tenantId),
      ]);

      const period = getCurrentPeriod();

      const usageSummary = {};
      for (const [metric, count] of Object.entries(usage)) {
        const limit = limits[metric];
        usageSummary[metric] = {
          current: count,
          limit: limit?.limit || null,
          percentage: limit?.limit ? Math.round((count / limit.limit) * 100) : null,
        };
      }

      let subscription = null;
      if (tenant.stripe_subscription_id) {
        try {
          subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        } catch (err) {
          console.error('[Billing] Failed to retrieve subscription:', err.message);
        }
      }

      return res.json({
        success: true,
        data: {
          plan: {
            name: tenant.plan_name || tenant.plan || 'Community',
            key: tenant.plan || 'community',
            status: subscription?.status || (tenant.stripe_subscription_id ? 'unknown' : 'free'),
          },
          billing_period: { start: period.start, end: period.end },
          usage: usageSummary,
          warnings,
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString().split('T')[0],
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString().split('T')[0],
              }
            : null,
        },
      });
    }

    // ─── POST /api/v1/billing/checkout — create Stripe Checkout session ───
    if (req.method === 'POST' && (path === '/checkout' || path.startsWith('/checkout'))) {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Billing not configured' });
      }

      let body = '';
      await new Promise((resolve) => {
        req.on('data', (c) => (body += c));
        req.on('end', resolve);
      });
      const { plan } = JSON.parse(body || '{}');

      if (!plan || !PLANS[plan]) {
        return res.status(400).json({
          success: false,
          error: `Invalid plan. Choose: ${Object.keys(PLANS).join(', ')}`,
        });
      }

      const selectedPlan = PLANS[plan];

      // Get or create Stripe customer
      const tenantResult = await query(
        'SELECT stripe_customer_id, name FROM tenants WHERE id = $1',
        [tenantId]
      );
      const tenant = tenantResult.rows[0];

      let customerId = tenant?.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: tenant?.name || user.name,
          metadata: { tenant_id: tenantId, user_id: user.id },
        });
        customerId = customer.id;
        await query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenantId]);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: selectedPlan.price_id, quantity: 1 }],
        success_url: `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/#settings?checkout=success`,
        cancel_url: `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/#settings?checkout=canceled`,
        metadata: { plan, tenant_id: tenantId },
        subscription_data: {
          metadata: { plan, tenant_id: tenantId },
        },
      });

      return res.json({
        success: true,
        data: { url: session.url, session_id: session.id },
      });
    }

    // ─── POST /api/v1/billing/portal — Stripe customer portal ───
    if (req.method === 'POST' && (path === '/portal' || path.startsWith('/portal'))) {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Billing not configured' });
      }

      const result = await query('SELECT stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);

      if (!result.rows[0]?.stripe_customer_id) {
        return res.status(404).json({
          error: 'No billing account found',
          message: 'Please subscribe to a plan first.',
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: result.rows[0].stripe_customer_id,
        return_url: `${process.env.CONSOLE_URL || 'https://console.regulator.ai'}/#settings`,
      });

      return res.json({
        success: true,
        data: { url: session.url },
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Not found. Endpoints: GET /plans, GET /, POST /checkout, POST /portal',
    });
  } catch (error) {
    console.error('[Billing] Error:', error);

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(500).json({ success: false, error: 'Billing operation failed' });
  }
};
