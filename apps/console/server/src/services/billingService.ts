/**
 * Billing Service — Vienna OS
 * 
 * Tracks per-tenant usage, enforces plan limits, integrates with Stripe for metered billing,
 * and generates usage alerts and summaries.
 * 
 * Features:
 * - Usage tracking: intents/month, agents, policies, storage
 * - Plan enforcement: Community (free, 5 agents), Team (25), Business (100), Enterprise (unlimited)  
 * - Stripe integration: Report metered usage, check plan limits
 * - Overage alerts: 80%, 90%, 100% thresholds
 * - Monthly usage summaries
 */

import { query, queryOne, transaction } from '../db/postgres.js';
import Stripe from 'stripe';
import { EventEmitter } from 'events';

// Plan configurations
export interface PlanLimits {
  name: string;
  max_agents: number;
  max_policies: number;
  max_intents_per_month: number;
  max_storage_gb: number;
  price_monthly: number;
  stripe_price_id?: string;
  overage_pricing?: {
    agents?: number;      // Per extra agent per month
    intents?: number;     // Per 1000 extra intents
    storage?: number;     // Per GB per month
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  community: {
    name: 'Community',
    max_agents: 5,
    max_policies: 10,
    max_intents_per_month: 1000,
    max_storage_gb: 1,
    price_monthly: 0,
  },
  team: {
    name: 'Team',
    max_agents: 25,
    max_policies: 50,
    max_intents_per_month: 10000,
    max_storage_gb: 10,
    price_monthly: 29,
    stripe_price_id: 'price_vienna_team_monthly',
    overage_pricing: {
      agents: 5,    // $5 per extra agent
      intents: 10,  // $10 per 1000 extra intents
      storage: 2,   // $2 per GB
    },
  },
  business: {
    name: 'Business', 
    max_agents: 100,
    max_policies: 100,
    max_intents_per_month: 50000,
    max_storage_gb: 50,
    price_monthly: 99,
    stripe_price_id: 'price_vienna_business_monthly',
    overage_pricing: {
      agents: 3,    // $3 per extra agent
      intents: 5,   // $5 per 1000 extra intents  
      storage: 1,   // $1 per GB
    },
  },
  enterprise: {
    name: 'Enterprise',
    max_agents: -1,     // Unlimited
    max_policies: -1,   // Unlimited
    max_intents_per_month: -1, // Unlimited
    max_storage_gb: -1, // Unlimited
    price_monthly: 299, // Base price, custom pricing available
    stripe_price_id: 'price_vienna_enterprise_monthly',
  },
};

export type UsageEventType = 
  | 'intent_submitted'
  | 'intent_approved' 
  | 'intent_denied'
  | 'execution_completed'
  | 'agent_registered'
  | 'policy_created'
  | 'storage_used';

export interface UsageEvent {
  tenant_id: string;
  event_type: UsageEventType;
  count: number;
  period: string; // YYYY-MM format
  metadata?: Record<string, any>;
  recorded_at?: string;
}

export interface UsageMetrics {
  intents_submitted: number;
  intents_approved: number;
  intents_denied: number;
  executions_completed: number;
  active_agents: number;
  total_policies: number;
  storage_gb: number;
}

export interface AlertThreshold {
  type: 'overage' | 'limit' | 'usage';
  metric: string;
  threshold_percent: number;
  message: string;
}

export class BillingService extends EventEmitter {
  private stripe?: Stripe;

  constructor() {
    super();
    
    // Initialize Stripe if API key is available
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
    }
  }

  /**
   * Record a usage event for billing tracking
   */
  async recordUsage(event: UsageEvent): Promise<void> {
    try {
      const now = new Date().toISOString();
      const period = event.period || new Date().toISOString().slice(0, 7); // YYYY-MM

      await query(
        `INSERT INTO usage_events (tenant_id, event_type, count, period, metadata, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, event_type, period) 
         DO UPDATE SET 
           count = usage_events.count + EXCLUDED.count,
           metadata = EXCLUDED.metadata,
           recorded_at = EXCLUDED.recorded_at`,
        [event.tenant_id, event.event_type, event.count, period, JSON.stringify(event.metadata || {}), now]
      );

      // Emit usage recorded event
      this.emit('usage_recorded', {
        tenant_id: event.tenant_id,
        event_type: event.event_type,
        count: event.count,
        period,
      });

      // Check for limit violations and generate alerts
      await this.checkUsageLimits(event.tenant_id, period);

    } catch (error) {
      console.error('[BillingService] Error recording usage:', error);
      throw error;
    }
  }

  /**
   * Get current usage metrics for a tenant
   */
  async getUsageMetrics(tenantId: string, period?: string): Promise<UsageMetrics> {
    try {
      const currentPeriod = period || new Date().toISOString().slice(0, 7);

      const events = await query<{
        event_type: string;
        count: number;
      }>(
        `SELECT event_type, SUM(count) as count
         FROM usage_events 
         WHERE tenant_id = $1 AND period = $2
         GROUP BY event_type`,
        [tenantId, currentPeriod]
      );

      // Get active agent count (distinct agents that sent heartbeat in last 24h)
      const activeAgents = await queryOne<{ count: number }>(
        `SELECT COUNT(DISTINCT agent_id) as count
         FROM usage_events 
         WHERE tenant_id = $1 
           AND event_type IN ('agent_registered', 'agent_heartbeat')
           AND recorded_at > NOW() - INTERVAL '24 hours'`,
        [tenantId]
      );

      // Get storage usage (latest storage event)
      const storageUsage = await queryOne<{ count: number }>(
        `SELECT count 
         FROM usage_events 
         WHERE tenant_id = $1 AND event_type = 'storage_used'
         ORDER BY recorded_at DESC 
         LIMIT 1`,
        [tenantId]
      );

      // Build metrics object
      const metrics: UsageMetrics = {
        intents_submitted: 0,
        intents_approved: 0,
        intents_denied: 0,
        executions_completed: 0,
        active_agents: activeAgents?.count || 0,
        total_policies: 0,
        storage_gb: storageUsage?.count || 0,
      };

      // Populate from events
      events.forEach(event => {
        switch (event.event_type) {
          case 'intent_submitted':
            metrics.intents_submitted = event.count;
            break;
          case 'intent_approved':
            metrics.intents_approved = event.count;
            break;
          case 'intent_denied':
            metrics.intents_denied = event.count;
            break;
          case 'execution_completed':
            metrics.executions_completed = event.count;
            break;
          case 'policy_created':
            metrics.total_policies = event.count;
            break;
        }
      });

      return metrics;

    } catch (error) {
      console.error('[BillingService] Error getting usage metrics:', error);
      throw error;
    }
  }

  /**
   * Get tenant's current plan and limits
   */
  async getTenantPlan(tenantId: string): Promise<{ plan: string; limits: PlanLimits }> {
    try {
      const tenant = await queryOne<{ plan: string }>(
        'SELECT plan FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      const limits = PLAN_LIMITS[tenant.plan] || PLAN_LIMITS.community;
      return { plan: tenant.plan, limits };

    } catch (error) {
      console.error('[BillingService] Error getting tenant plan:', error);
      throw error;
    }
  }

  /**
   * Check if tenant has exceeded plan limits
   */
  async checkPlanLimits(tenantId: string, action?: string): Promise<{
    allowed: boolean;
    reason?: string;
    usage?: UsageMetrics;
    limits?: PlanLimits;
  }> {
    try {
      const { limits } = await this.getTenantPlan(tenantId);
      const usage = await this.getUsageMetrics(tenantId);

      // Enterprise plans have unlimited resources
      if (limits.max_agents === -1) {
        return { allowed: true };
      }

      // Check specific action limits
      switch (action) {
        case 'register_agent':
          if (usage.active_agents >= limits.max_agents) {
            return {
              allowed: false,
              reason: `Agent limit exceeded (${usage.active_agents}/${limits.max_agents}). Upgrade plan to add more agents.`,
              usage,
              limits,
            };
          }
          break;

        case 'create_policy':
          if (usage.total_policies >= limits.max_policies) {
            return {
              allowed: false,
              reason: `Policy limit exceeded (${usage.total_policies}/${limits.max_policies}). Upgrade plan to add more policies.`,
              usage,
              limits,
            };
          }
          break;

        case 'submit_intent':
          if (usage.intents_submitted >= limits.max_intents_per_month) {
            return {
              allowed: false,
              reason: `Monthly intent limit exceeded (${usage.intents_submitted}/${limits.max_intents_per_month}). Limit resets next month or upgrade plan.`,
              usage,
              limits,
            };
          }
          break;
      }

      return { allowed: true, usage, limits };

    } catch (error) {
      console.error('[BillingService] Error checking plan limits:', error);
      throw error;
    }
  }

  /**
   * Check usage against limits and generate alerts
   */
  async checkUsageLimits(tenantId: string, period: string): Promise<void> {
    try {
      const { limits } = await this.getTenantPlan(tenantId);
      const usage = await this.getUsageMetrics(tenantId, period);

      // Skip unlimited plans
      if (limits.max_agents === -1) return;

      const alerts: AlertThreshold[] = [];

      // Check agent usage
      if (limits.max_agents > 0) {
        const agentUsagePercent = (usage.active_agents / limits.max_agents) * 100;
        
        if (agentUsagePercent >= 100) {
          alerts.push({
            type: 'limit',
            metric: 'agents',
            threshold_percent: 100,
            message: `Agent limit reached (${usage.active_agents}/${limits.max_agents}). New agents cannot be registered.`,
          });
        } else if (agentUsagePercent >= 90) {
          alerts.push({
            type: 'overage',
            metric: 'agents', 
            threshold_percent: 90,
            message: `90% of agent limit reached (${usage.active_agents}/${limits.max_agents}). Consider upgrading your plan.`,
          });
        } else if (agentUsagePercent >= 80) {
          alerts.push({
            type: 'overage',
            metric: 'agents',
            threshold_percent: 80,
            message: `80% of agent limit reached (${usage.active_agents}/${limits.max_agents}). Monitor usage closely.`,
          });
        }
      }

      // Check intent usage
      if (limits.max_intents_per_month > 0) {
        const intentUsagePercent = (usage.intents_submitted / limits.max_intents_per_month) * 100;
        
        if (intentUsagePercent >= 100) {
          alerts.push({
            type: 'limit',
            metric: 'intents',
            threshold_percent: 100,
            message: `Monthly intent limit reached (${usage.intents_submitted}/${limits.max_intents_per_month}). Limit resets next month.`,
          });
        } else if (intentUsagePercent >= 90) {
          alerts.push({
            type: 'overage',
            metric: 'intents',
            threshold_percent: 90,
            message: `90% of monthly intent limit reached (${usage.intents_submitted}/${limits.max_intents_per_month}).`,
          });
        } else if (intentUsagePercent >= 80) {
          alerts.push({
            type: 'overage',
            metric: 'intents',
            threshold_percent: 80,
            message: `80% of monthly intent limit reached (${usage.intents_submitted}/${limits.max_intents_per_month}).`,
          });
        }
      }

      // Check storage usage
      if (limits.max_storage_gb > 0) {
        const storageUsagePercent = (usage.storage_gb / limits.max_storage_gb) * 100;
        
        if (storageUsagePercent >= 100) {
          alerts.push({
            type: 'limit',
            metric: 'storage',
            threshold_percent: 100,
            message: `Storage limit reached (${usage.storage_gb}GB/${limits.max_storage_gb}GB). Free up space or upgrade plan.`,
          });
        } else if (storageUsagePercent >= 90) {
          alerts.push({
            type: 'overage', 
            metric: 'storage',
            threshold_percent: 90,
            message: `90% of storage limit reached (${usage.storage_gb}GB/${limits.max_storage_gb}GB).`,
          });
        }
      }

      // Store and emit alerts
      for (const alert of alerts) {
        await this.recordBillingAlert(tenantId, alert);
        
        this.emit('usage_alert', {
          tenant_id: tenantId,
          alert,
          usage,
          limits,
        });
      }

    } catch (error) {
      console.error('[BillingService] Error checking usage limits:', error);
      // Don't throw - this is a background check
    }
  }

  /**
   * Record a billing alert
   */
  async recordBillingAlert(tenantId: string, alert: AlertThreshold): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Check if we already sent this alert recently (within last 24h)
      const existingAlert = await queryOne(
        `SELECT id FROM billing_alerts 
         WHERE tenant_id = $1 
           AND alert_type = $2 
           AND metric = $3 
           AND threshold_percent = $4
           AND triggered_at > NOW() - INTERVAL '24 hours'`,
        [tenantId, alert.type, alert.metric, alert.threshold_percent]
      );

      if (existingAlert) {
        // Don't spam alerts - only once per 24h
        return;
      }

      await query(
        `INSERT INTO billing_alerts (tenant_id, alert_type, metric, threshold_percent, message, triggered_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, alert.type, alert.metric, alert.threshold_percent, alert.message, now]
      );

    } catch (error) {
      console.error('[BillingService] Error recording billing alert:', error);
      throw error;
    }
  }

  /**
   * Generate monthly usage summary
   */
  async generateMonthlySummary(tenantId: string, period: string): Promise<{
    tenant_id: string;
    period: string;
    plan: string;
    metrics: UsageMetrics;
    limits: PlanLimits;
    overage_charges?: number;
    summary: string;
  }> {
    try {
      const { plan, limits } = await this.getTenantPlan(tenantId);
      const metrics = await this.getUsageMetrics(tenantId, period);

      // Calculate overage charges
      let overageCharges = 0;
      const overageDetails: string[] = [];

      if (limits.overage_pricing) {
        // Agent overage
        if (limits.max_agents > 0 && metrics.active_agents > limits.max_agents) {
          const extraAgents = metrics.active_agents - limits.max_agents;
          const agentOverageCharge = extraAgents * (limits.overage_pricing.agents || 0);
          overageCharges += agentOverageCharge;
          overageDetails.push(`${extraAgents} extra agents: $${agentOverageCharge.toFixed(2)}`);
        }

        // Intent overage (charged per 1000)
        if (limits.max_intents_per_month > 0 && metrics.intents_submitted > limits.max_intents_per_month) {
          const extraIntents = metrics.intents_submitted - limits.max_intents_per_month;
          const intentBlocks = Math.ceil(extraIntents / 1000);
          const intentOverageCharge = intentBlocks * (limits.overage_pricing.intents || 0);
          overageCharges += intentOverageCharge;
          overageDetails.push(`${extraIntents} extra intents (${intentBlocks} blocks): $${intentOverageCharge.toFixed(2)}`);
        }

        // Storage overage
        if (limits.max_storage_gb > 0 && metrics.storage_gb > limits.max_storage_gb) {
          const extraStorage = metrics.storage_gb - limits.max_storage_gb;
          const storageOverageCharge = extraStorage * (limits.overage_pricing.storage || 0);
          overageCharges += storageOverageCharge;
          overageDetails.push(`${extraStorage.toFixed(1)}GB extra storage: $${storageOverageCharge.toFixed(2)}`);
        }
      }

      // Generate summary text
      const summary = `
Vienna OS Usage Summary - ${period}

Plan: ${limits.name} ($${limits.price_monthly}/month)

Usage:
- Intents: ${metrics.intents_submitted.toLocaleString()}${limits.max_intents_per_month > 0 ? ` / ${limits.max_intents_per_month.toLocaleString()} (${((metrics.intents_submitted / limits.max_intents_per_month) * 100).toFixed(1)}%)` : ' (unlimited)'}
- Agents: ${metrics.active_agents}${limits.max_agents > 0 ? ` / ${limits.max_agents} (${((metrics.active_agents / limits.max_agents) * 100).toFixed(1)}%)` : ' (unlimited)'}
- Policies: ${metrics.total_policies}${limits.max_policies > 0 ? ` / ${limits.max_policies}` : ' (unlimited)'}
- Storage: ${metrics.storage_gb.toFixed(1)}GB${limits.max_storage_gb > 0 ? ` / ${limits.max_storage_gb}GB` : ' (unlimited)'}
- Executions: ${metrics.executions_completed.toLocaleString()}

Success Rate: ${metrics.intents_submitted > 0 ? ((metrics.intents_approved / metrics.intents_submitted) * 100).toFixed(1) : 0}%

${overageCharges > 0 ? `
Overage Charges:
${overageDetails.join('\n')}

Total Overage: $${overageCharges.toFixed(2)}
` : ''}

Total: $${(limits.price_monthly + overageCharges).toFixed(2)}
      `.trim();

      // Store summary in database
      await query(
        `INSERT INTO usage_summaries (tenant_id, period, metrics, overage_charges, summary, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, period) DO UPDATE SET
           metrics = EXCLUDED.metrics,
           overage_charges = EXCLUDED.overage_charges,
           summary = EXCLUDED.summary,
           generated_at = EXCLUDED.generated_at`,
        [
          tenantId,
          period,
          JSON.stringify(metrics),
          overageCharges,
          summary,
          new Date().toISOString()
        ]
      );

      return {
        tenant_id: tenantId,
        period,
        plan,
        metrics,
        limits,
        overage_charges: overageCharges,
        summary,
      };

    } catch (error) {
      console.error('[BillingService] Error generating monthly summary:', error);
      throw error;
    }
  }

  /**
   * Report usage to Stripe (for metered billing)
   */
  async reportStripeUsage(tenantId: string, period: string): Promise<boolean> {
    try {
      if (!this.stripe) {
        console.warn('[BillingService] Stripe not configured - skipping usage report');
        return false;
      }

      // Get tenant's Stripe customer ID
      const tenant = await queryOne<{ stripe_customer_id?: string }>(
        'SELECT stripe_customer_id FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (!tenant?.stripe_customer_id) {
        console.warn(`[BillingService] No Stripe customer ID for tenant ${tenantId}`);
        return false;
      }

      const metrics = await this.getUsageMetrics(tenantId, period);

      // Report metered usage to Stripe
      const usageRecords = [];

      // Example: Report intent usage
      if (metrics.intents_submitted > 0) {
        usageRecords.push(
          this.stripe.subscriptionItems.createUsageRecord('si_intent_usage', {
            quantity: metrics.intents_submitted,
            timestamp: Math.floor(Date.now() / 1000),
          })
        );
      }

      // Example: Report storage usage
      if (metrics.storage_gb > 0) {
        usageRecords.push(
          this.stripe.subscriptionItems.createUsageRecord('si_storage_usage', {
            quantity: Math.round(metrics.storage_gb * 1000), // Report in MB
            timestamp: Math.floor(Date.now() / 1000),
          })
        );
      }

      await Promise.all(usageRecords);

      console.log(`[BillingService] Reported usage to Stripe for tenant ${tenantId}:`, {
        intents: metrics.intents_submitted,
        storage_gb: metrics.storage_gb,
      });

      return true;

    } catch (error) {
      console.error('[BillingService] Error reporting usage to Stripe:', error);
      return false;
    }
  }

  /**
   * Get billing alerts for a tenant
   */
  async getBillingAlerts(tenantId: string, daysBack: number = 7): Promise<Array<{
    id: string;
    alert_type: string;
    metric: string;
    threshold_percent: number;
    message: string;
    triggered_at: string;
  }>> {
    try {
      const alerts = await query<{
        id: string;
        alert_type: string;
        metric: string;
        threshold_percent: number;
        message: string;
        triggered_at: string;
      }>(
        `SELECT id, alert_type, metric, threshold_percent, message, triggered_at
         FROM billing_alerts 
         WHERE tenant_id = $1 
           AND triggered_at > NOW() - INTERVAL '${daysBack} days'
         ORDER BY triggered_at DESC`,
        [tenantId]
      );

      return alerts;

    } catch (error) {
      console.error('[BillingService] Error getting billing alerts:', error);
      throw error;
    }
  }

  /**
   * Get usage trends for analytics
   */
  async getUsageTrends(tenantId: string, months: number = 6): Promise<Array<{
    period: string;
    metrics: UsageMetrics;
  }>> {
    try {
      const results = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const period = date.toISOString().slice(0, 7); // YYYY-MM
        const metrics = await this.getUsageMetrics(tenantId, period);
        
        results.push({ period, metrics });
      }

      return results;

    } catch (error) {
      console.error('[BillingService] Error getting usage trends:', error);
      throw error;
    }
  }
}

// Singleton instance
export const billingService = new BillingService();

// Event handlers for automatic usage tracking
billingService.on('usage_alert', async (data) => {
  console.warn(`[BillingService] Usage alert for tenant ${data.tenant_id}:`, data.alert.message);
  
  // Here you could integrate with notification systems:
  // - Send email alerts
  // - Post to Slack
  // - Create support tickets
  // - Update dashboard notifications
});

billingService.on('usage_recorded', async (data) => {
  // Optional: Log usage events for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[BillingService] Usage recorded:`, data);
  }
});

export default billingService;