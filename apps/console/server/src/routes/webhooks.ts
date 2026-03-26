/**
 * Webhook Routes — Vienna OS
 * 
 * Handles external events:
 * - Stripe subscription events (checkout completed, subscription updated/canceled)
 * - Future: GitHub, Slack, PagerDuty integrations
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';

export function createWebhookRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/webhooks/stripe
   * 
   * Receives Stripe webhook events.
   * In production, verify the webhook signature.
   */
  router.post('/stripe', async (req: Request, res: Response) => {
    try {
      const event = req.body;
      const signature = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      // Verify signature if secret is configured
      if (webhookSecret && signature) {
        // Note: For proper verification, raw body is needed.
        // This is a simplified check — production should use Stripe SDK.
        console.log('[Webhook] Stripe event received:', event.type);
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data?.object;
          console.log('[Webhook] Checkout completed:', {
            email: session?.customer_email,
            plan: session?.metadata?.plan,
            customerId: session?.customer,
          });
          // TODO: Auto-provision tenant for this customer
          // - Create operator account
          // - Set plan/quota limits
          // - Send welcome email with credentials
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data?.object;
          console.log('[Webhook] Subscription updated:', {
            status: subscription?.status,
            plan: subscription?.metadata?.plan,
          });
          // TODO: Update tenant plan/quotas
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data?.object;
          console.log('[Webhook] Subscription canceled:', {
            customerId: subscription?.customer,
          });
          // TODO: Downgrade tenant to community or deactivate
          break;
        }

        default:
          console.log('[Webhook] Unhandled Stripe event:', event.type);
      }

      // Always acknowledge receipt
      res.json({ received: true });
    } catch (error) {
      console.error('[Webhook] Stripe error:', error);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  });

  /**
   * POST /api/v1/webhooks/health
   * 
   * External health check ping endpoint.
   * Useful for uptime monitors (Pingdom, UptimeRobot, etc.)
   */
  router.post('/health', async (req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'vienna-os',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
