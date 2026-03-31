/**
 * Billing & Stripe Customer Portal
 * Handles Stripe customer portal session creation
 */

const { extractTenantId } = require('../../lib/auth');

module.exports = async (req, res) => {
  // Only POST /api/v1/billing/portal
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lazy-load Stripe (only when billing endpoint is hit)
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ 
        error: 'Billing not configured',
        message: 'Stripe integration not available.'
      });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const tenant_id = extractTenantId(req);
    if (!tenant_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get tenant's Stripe customer ID from database
    const { query } = require('../../database/client');
    const result = await query(
      `SELECT stripe_customer_id FROM tenants WHERE id = $1`,
      [tenant_id]
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
      url: session.url,
      expires_at: new Date(session.created * 1000 + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[Billing Portal] Error:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid billing request',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to create portal session',
      message: 'Please try again later.'
    });
  }
};
