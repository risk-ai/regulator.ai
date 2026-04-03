/**
 * Webhook Routes — Vienna OS
 * 
 * Handles external events:
 * - Stripe subscription lifecycle (checkout → provisioning → updates → cancellation)
 * - Future: GitHub, Slack, PagerDuty integrations
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute, transaction } from '../db/postgres.js';
import { PLAN_LIMITS } from '../services/billingService.js';

// ─── Stripe Signature Verification ───

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const elements = signature.split(',');
    const timestampPart = elements.find(e => e.startsWith('t='));
    const sigPart = elements.find(e => e.startsWith('v1='));
    
    if (!timestampPart || !sigPart) return false;
    
    const timestamp = timestampPart.split('=')[1];
    const sig = sigPart.split('=')[1];
    
    // Verify signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    if (sig !== expectedSig) return false;
    
    // Check timestamp tolerance (5 minutes)
    const tolerance = 300;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > tolerance) {
      console.warn('[Webhook] Stripe signature timestamp outside tolerance');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[Webhook] Stripe signature verification error:', err);
    return false;
  }
}

// ─── Plan Resolution ───

/** Map Stripe price ID or metadata plan name → internal plan key */
function resolvePlan(session: any): string {
  // Check metadata first (set during checkout creation)
  if (session?.metadata?.plan) {
    const plan = session.metadata.plan.toLowerCase();
    if (PLAN_LIMITS[plan]) return plan;
  }
  
  // Check price ID
  const priceId = session?.line_items?.data?.[0]?.price?.id 
    || session?.items?.data?.[0]?.price?.id
    || session?.plan?.id;
  
  if (priceId) {
    const teamPrice = process.env.STRIPE_PRICE_TEAM_MONTHLY || process.env.STRIPE_TEAM_PRICE;
    const businessPrice = process.env.STRIPE_PRICE_BUSINESS_MONTHLY || process.env.STRIPE_BUSINESS_PRICE;
    const enterprisePrice = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY;
    
    if (priceId === teamPrice) return 'team';
    if (priceId === businessPrice) return 'business';
    if (priceId === enterprisePrice) return 'enterprise';
  }
  
  return 'team'; // Safe default for paid plans
}

/** Get plan limits */
function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.community;
}

// ─── Email Helpers ───

async function sendWelcomeEmail(email: string, name: string, plan: string, tenantSlug: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[Webhook] RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const planLimits = getPlanLimits(plan);
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vienna OS <hello@regulator.ai>',
        to: email,
        subject: `Welcome to Vienna OS ${planLimits.name} 🚀`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Welcome to Vienna OS!</h1>
            <p>Hi ${name || 'there'},</p>
            <p>Your <strong>${planLimits.name}</strong> plan is now active. Here's what you get:</p>
            <ul>
              <li><strong>${planLimits.max_agents === -1 ? 'Unlimited' : planLimits.max_agents}</strong> agents</li>
              <li><strong>${planLimits.max_policies === -1 ? 'Unlimited' : planLimits.max_policies}</strong> policies</li>
              <li><strong>${planLimits.max_intents_per_month === -1 ? 'Unlimited' : planLimits.max_intents_per_month.toLocaleString()}</strong> intents/month</li>
              <li><strong>${planLimits.max_storage_gb === -1 ? 'Unlimited' : planLimits.max_storage_gb}GB</strong> storage</li>
            </ul>
            <h2 style="color: #7c3aed;">Get Started</h2>
            <ol>
              <li>Log in at <a href="https://console.regulator.ai" style="color: #7c3aed;">console.regulator.ai</a></li>
              <li>Create your first API key in Settings → API Keys</li>
              <li>Install the SDK: <code>npm install vienna-os</code></li>
            </ol>
            <p>
              <a href="https://regulator.ai/docs/quickstart" 
                 style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Read the Quick Start Guide →
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
              Questions? Reply to this email or visit <a href="https://github.com/risk-ai/vienna-os/discussions" style="color: #7c3aed;">our community</a>.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Webhook] Welcome email failed:', err);
    } else {
      console.log(`[Webhook] Welcome email sent to ${email}`);
    }
  } catch (err) {
    console.error('[Webhook] Welcome email error:', err);
  }
}

async function sendPlanChangeEmail(email: string, oldPlan: string, newPlan: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;
  
  const newLimits = getPlanLimits(newPlan);
  
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vienna OS <hello@regulator.ai>',
        to: email,
        subject: `Your Vienna OS plan has been updated`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Plan Updated</h1>
            <p>Your Vienna OS plan has changed from <strong>${PLAN_LIMITS[oldPlan]?.name || oldPlan}</strong> 
               to <strong>${newLimits.name}</strong>.</p>
            <p>Your new limits are now active:</p>
            <ul>
              <li><strong>${newLimits.max_agents === -1 ? 'Unlimited' : newLimits.max_agents}</strong> agents</li>
              <li><strong>${newLimits.max_intents_per_month === -1 ? 'Unlimited' : newLimits.max_intents_per_month.toLocaleString()}</strong> intents/month</li>
            </ul>
            <p><a href="https://console.regulator.ai" style="color: #7c3aed;">View your dashboard →</a></p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('[Webhook] Plan change email error:', err);
  }
}

// ─── Router ───

export function createWebhookRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/webhooks/stripe
   * 
   * Handles the full Stripe subscription lifecycle:
   * - checkout.session.completed → Provision tenant + user + plan
   * - customer.subscription.updated → Update plan/quotas
   * - customer.subscription.deleted → Downgrade to community
   * - invoice.payment_failed → Alert + grace period
   */
  router.post('/stripe', async (req: Request, res: Response) => {
    try {
      const event = req.body;
      const signature = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      // Verify signature in production
      if (webhookSecret && signature) {
        const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
          console.error('[Webhook] Stripe signature verification failed');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      console.log('[Webhook] Stripe event received:', event.type, event.id);

      switch (event.type) {

        // ─── Checkout Completed → Full Tenant Provisioning ───
        case 'checkout.session.completed': {
          const session = event.data?.object;
          const email = session?.customer_email || session?.customer_details?.email;
          const customerName = session?.metadata?.customer_name || session?.customer_details?.name || '';
          const stripeCustomerId = session?.customer;
          const plan = resolvePlan(session);
          const limits = getPlanLimits(plan);

          if (!email) {
            console.error('[Webhook] checkout.session.completed missing email — cannot provision');
            break;
          }

          console.log('[Webhook] Provisioning tenant:', { email, plan, stripeCustomerId });

          try {
            // 1. Create tenant
            const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 100)
              + '-' + crypto.randomBytes(3).toString('hex');

            const tenant = await queryOne<{ id: string }>(
              `INSERT INTO tenants (name, slug, plan, max_agents, max_policies, settings, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW())
               RETURNING id`,
              [
                customerName || email.split('@')[0],
                slug,
                plan,
                limits.max_agents,
                limits.max_policies,
                JSON.stringify({
                  stripe_customer_id: stripeCustomerId,
                  stripe_subscription_id: session?.subscription,
                  max_intents_per_month: limits.max_intents_per_month,
                  max_storage_gb: limits.max_storage_gb,
                  provisioned_at: new Date().toISOString(),
                  provisioned_from: 'stripe_webhook',
                }),
              ]
            );

            if (!tenant) {
              console.error('[Webhook] Failed to create tenant');
              break;
            }

            const tenantId = tenant.id;

            // 2. Create user (operator) with temporary password
            const tempPassword = crypto.randomBytes(16).toString('base64url');
            const passwordHash = await hashPassword(tempPassword);

            await execute(
              `INSERT INTO users (tenant_id, email, password_hash, name, role, created_at)
               VALUES ($1, $2, $3, $4, 'admin', NOW())
               ON CONFLICT (tenant_id, email) DO UPDATE SET
                 password_hash = EXCLUDED.password_hash,
                 name = EXCLUDED.name`,
              [tenantId, email, passwordHash, customerName || null]
            );

            // 3. Create a default API key for the tenant
            const apiKeyRaw = `vos_${crypto.randomBytes(24).toString('hex')}`;
            const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
            const keyPrefix = apiKeyRaw.substring(0, 8);

            await execute(
              `INSERT INTO api_keys (tenant_id, key_hash, key_prefix, name, scopes, rate_limit, created_at)
               VALUES ($1, $2, $3, 'Default API Key', $4, $5, NOW())`,
              [
                tenantId,
                keyHash,
                keyPrefix,
                JSON.stringify(['intent:submit', 'execution:report', 'agent:register', 'policy:read', 'warrant:read']),
                limits.max_intents_per_month === -1 ? 10000 : Math.min(limits.max_intents_per_month, 10000),
              ]
            );

            // 4. Record initial usage events
            const period = new Date().toISOString().slice(0, 7);
            await execute(
              `INSERT INTO usage_events (tenant_id, event_type, count, period, metadata)
               VALUES ($1::uuid, 'intent_submitted', 0, $2, '{}')
               ON CONFLICT DO NOTHING`,
              [tenantId, period]
            );

            // 5. Audit log
            await execute(
              `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
               VALUES ($1, 'tenant.provisioned', 'stripe_webhook', $2, 0, NOW())`,
              [tenantId, JSON.stringify({
                email,
                plan,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: session?.subscription,
                checkout_session_id: session?.id,
              })]
            );

            console.log(`[Webhook] ✅ Tenant provisioned: ${tenantId} (${email}, ${plan})`);

            // 6. Send welcome email (async, don't block webhook response)
            sendWelcomeEmail(email, customerName, plan, slug).catch(err => {
              console.error('[Webhook] Welcome email failed (non-blocking):', err);
            });

          } catch (provisionErr: any) {
            console.error('[Webhook] Tenant provisioning failed:', provisionErr);
            // Still acknowledge the webhook — we can retry manually
            // Log for manual recovery
            await execute(
              `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
               VALUES ('00000000-0000-0000-0000-000000000000', 'tenant.provision_failed', 'stripe_webhook', $1, 2, NOW())`,
              [JSON.stringify({
                email,
                plan,
                error: provisionErr.message,
                stripe_customer_id: stripeCustomerId,
                checkout_session_id: session?.id,
              })]
            ).catch(() => {});
          }
          break;
        }

        // ─── Subscription Updated → Update Plan/Quotas ───
        case 'customer.subscription.updated': {
          const subscription = event.data?.object;
          const stripeCustomerId = subscription?.customer;
          const newPlan = resolvePlan(subscription);
          const newLimits = getPlanLimits(newPlan);

          if (!stripeCustomerId) {
            console.warn('[Webhook] subscription.updated missing customer ID');
            break;
          }

          console.log('[Webhook] Updating subscription:', { stripeCustomerId, newPlan });

          try {
            // Find tenant by Stripe customer ID
            const tenant = await queryOne<{ id: string; plan: string; settings: any }>(
              `SELECT id, plan, settings FROM tenants
               WHERE settings->>'stripe_customer_id' = $1`,
              [stripeCustomerId]
            );

            if (!tenant) {
              console.warn(`[Webhook] No tenant found for Stripe customer ${stripeCustomerId}`);
              break;
            }

            const oldPlan = tenant.plan;
            
            // Only update if plan actually changed
            if (oldPlan === newPlan && subscription?.status === 'active') {
              console.log('[Webhook] Plan unchanged, skipping update');
              break;
            }

            // Handle subscription status changes
            const isActive = ['active', 'trialing'].includes(subscription?.status);
            
            if (isActive) {
              // Update plan and quotas
              const settings = typeof tenant.settings === 'string' 
                ? JSON.parse(tenant.settings) 
                : (tenant.settings || {});
              
              settings.stripe_subscription_status = subscription.status;
              settings.max_intents_per_month = newLimits.max_intents_per_month;
              settings.max_storage_gb = newLimits.max_storage_gb;
              settings.plan_updated_at = new Date().toISOString();

              await execute(
                `UPDATE tenants SET
                   plan = $2,
                   max_agents = $3,
                   max_policies = $4,
                   settings = $5,
                   updated_at = NOW()
                 WHERE id = $1`,
                [
                  tenant.id,
                  newPlan,
                  newLimits.max_agents,
                  newLimits.max_policies,
                  JSON.stringify(settings),
                ]
              );

              console.log(`[Webhook] ✅ Tenant ${tenant.id} updated: ${oldPlan} → ${newPlan}`);

              // Audit log
              await execute(
                `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
                 VALUES ($1, 'tenant.plan_updated', 'stripe_webhook', $2, 0, NOW())`,
                [tenant.id, JSON.stringify({
                  old_plan: oldPlan,
                  new_plan: newPlan,
                  stripe_customer_id: stripeCustomerId,
                  subscription_status: subscription.status,
                })]
              );

              // Notify user of plan change
              if (oldPlan !== newPlan) {
                const user = await queryOne<{ email: string }>(
                  `SELECT email FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
                  [tenant.id]
                );
                if (user?.email) {
                  sendPlanChangeEmail(user.email, oldPlan, newPlan).catch(() => {});
                }
              }
            } else if (subscription?.status === 'past_due') {
              // Grace period — log but don't downgrade yet
              console.warn(`[Webhook] ⚠️ Subscription past_due for tenant ${tenant.id}`);
              await execute(
                `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
                 VALUES ($1, 'billing.past_due', 'stripe_webhook', $2, 1, NOW())`,
                [tenant.id, JSON.stringify({
                  stripe_customer_id: stripeCustomerId,
                  subscription_status: subscription.status,
                })]
              );
            }
          } catch (updateErr: any) {
            console.error('[Webhook] Subscription update failed:', updateErr);
          }
          break;
        }

        // ─── Subscription Deleted → Downgrade to Community ───
        case 'customer.subscription.deleted': {
          const subscription = event.data?.object;
          const stripeCustomerId = subscription?.customer;

          if (!stripeCustomerId) {
            console.warn('[Webhook] subscription.deleted missing customer ID');
            break;
          }

          console.log('[Webhook] Subscription canceled:', { stripeCustomerId });

          try {
            // Find tenant
            const tenant = await queryOne<{ id: string; plan: string; settings: any }>(
              `SELECT id, plan, settings FROM tenants
               WHERE settings->>'stripe_customer_id' = $1`,
              [stripeCustomerId]
            );

            if (!tenant) {
              console.warn(`[Webhook] No tenant found for Stripe customer ${stripeCustomerId}`);
              break;
            }

            const oldPlan = tenant.plan;
            const communityLimits = getPlanLimits('community');
            
            const settings = typeof tenant.settings === 'string'
              ? JSON.parse(tenant.settings)
              : (tenant.settings || {});
            
            settings.stripe_subscription_status = 'canceled';
            settings.downgraded_at = new Date().toISOString();
            settings.previous_plan = oldPlan;
            settings.max_intents_per_month = communityLimits.max_intents_per_month;
            settings.max_storage_gb = communityLimits.max_storage_gb;

            // Downgrade to community
            await execute(
              `UPDATE tenants SET
                 plan = 'community',
                 max_agents = $2,
                 max_policies = $3,
                 settings = $4,
                 updated_at = NOW()
               WHERE id = $1`,
              [
                tenant.id,
                communityLimits.max_agents,
                communityLimits.max_policies,
                JSON.stringify(settings),
              ]
            );

            console.log(`[Webhook] ✅ Tenant ${tenant.id} downgraded: ${oldPlan} → community`);

            // Audit log
            await execute(
              `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
               VALUES ($1, 'tenant.downgraded', 'stripe_webhook', $2, 1, NOW())`,
              [tenant.id, JSON.stringify({
                old_plan: oldPlan,
                new_plan: 'community',
                stripe_customer_id: stripeCustomerId,
                reason: 'subscription_canceled',
              })]
            );

            // Notify user
            const user = await queryOne<{ email: string }>(
              `SELECT email FROM users WHERE tenant_id = $1 AND role = 'admin' LIMIT 1`,
              [tenant.id]
            );
            if (user?.email) {
              sendPlanChangeEmail(user.email, oldPlan, 'community').catch(() => {});
            }
          } catch (downgradeErr: any) {
            console.error('[Webhook] Subscription downgrade failed:', downgradeErr);
          }
          break;
        }

        // ─── Invoice Payment Failed ───
        case 'invoice.payment_failed': {
          const invoice = event.data?.object;
          const stripeCustomerId = invoice?.customer;

          console.warn('[Webhook] ⚠️ Payment failed:', { stripeCustomerId, invoice_id: invoice?.id });

          try {
            const tenant = await queryOne<{ id: string }>(
              `SELECT id FROM tenants WHERE settings->>'stripe_customer_id' = $1`,
              [stripeCustomerId]
            );

            if (tenant) {
              await execute(
                `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
                 VALUES ($1, 'billing.payment_failed', 'stripe_webhook', $2, 2, NOW())`,
                [tenant.id, JSON.stringify({
                  stripe_customer_id: stripeCustomerId,
                  invoice_id: invoice?.id,
                  amount_due: invoice?.amount_due,
                  attempt_count: invoice?.attempt_count,
                })]
              );

              // Create billing alert
              await execute(
                `INSERT INTO billing_alerts (tenant_id, alert_type, metric, threshold_percent, message, metadata)
                 VALUES ($1, 'usage', 'intents', 100, $2, $3)`,
                [
                  tenant.id,
                  `Payment failed (attempt ${invoice?.attempt_count || 1}). Please update your payment method.`,
                  JSON.stringify({ invoice_id: invoice?.id, stripe_customer_id: stripeCustomerId }),
                ]
              ).catch(() => {});
            }
          } catch (err) {
            console.error('[Webhook] Payment failed handler error:', err);
          }
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
   * External health check ping endpoint.
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

// ─── Utility ───

/** Hash a password with bcrypt-compatible approach using Node crypto */
async function hashPassword(password: string): Promise<string> {
  // Use scrypt for password hashing (Node native, no bcrypt dependency needed)
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}
