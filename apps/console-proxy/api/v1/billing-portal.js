/**
 * Billing Portal API — Stripe Customer Portal Integration
 * 
 * Redirects authenticated users to Stripe customer portal for billing management.
 * Requires Stripe API keys configured.
 */

const { requireAuth } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // In production, this would:
    // 1. Get user's Stripe customer ID from database
    // 2. Create Stripe billing portal session
    // 3. Return portal URL
    
    // For now, return placeholder (Stripe integration requires API keys)
    const portalUrl = process.env.STRIPE_PORTAL_URL || 'https://billing.stripe.com';

    return res.json({
      success: true,
      portal_url: portalUrl,
      message: 'Stripe portal integration requires STRIPE_SECRET_KEY environment variable',
    });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'billing-portal' } });
    console.error('Billing portal error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
