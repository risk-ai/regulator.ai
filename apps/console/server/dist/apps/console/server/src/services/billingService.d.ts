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
import { EventEmitter } from 'events';
export interface PlanLimits {
    name: string;
    max_agents: number;
    max_policies: number;
    max_intents_per_month: number;
    max_storage_gb: number;
    price_monthly: number;
    stripe_price_id?: string;
    overage_pricing?: {
        agents?: number;
        intents?: number;
        storage?: number;
    };
}
export declare const PLAN_LIMITS: Record<string, PlanLimits>;
export type UsageEventType = 'intent_submitted' | 'intent_approved' | 'intent_denied' | 'execution_completed' | 'agent_registered' | 'policy_created' | 'storage_used';
export interface UsageEvent {
    tenant_id: string;
    event_type: UsageEventType;
    count: number;
    period: string;
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
export declare class BillingService extends EventEmitter {
    private stripe?;
    constructor();
    /**
     * Record a usage event for billing tracking
     */
    recordUsage(event: UsageEvent): Promise<void>;
    /**
     * Get current usage metrics for a tenant
     */
    getUsageMetrics(tenantId: string, period?: string): Promise<UsageMetrics>;
    /**
     * Get tenant's current plan and limits
     */
    getTenantPlan(tenantId: string): Promise<{
        plan: string;
        limits: PlanLimits;
    }>;
    /**
     * Check if tenant has exceeded plan limits
     */
    checkPlanLimits(tenantId: string, action?: string): Promise<{
        allowed: boolean;
        reason?: string;
        usage?: UsageMetrics;
        limits?: PlanLimits;
    }>;
    /**
     * Check usage against limits and generate alerts
     */
    checkUsageLimits(tenantId: string, period: string): Promise<void>;
    /**
     * Record a billing alert
     */
    recordBillingAlert(tenantId: string, alert: AlertThreshold): Promise<void>;
    /**
     * Generate monthly usage summary
     */
    generateMonthlySummary(tenantId: string, period: string): Promise<{
        tenant_id: string;
        period: string;
        plan: string;
        metrics: UsageMetrics;
        limits: PlanLimits;
        overage_charges?: number;
        summary: string;
    }>;
    /**
     * Report usage to Stripe (for metered billing)
     */
    reportStripeUsage(tenantId: string, period: string): Promise<boolean>;
    /**
     * Get billing alerts for a tenant
     */
    getBillingAlerts(tenantId: string, daysBack?: number): Promise<Array<{
        id: string;
        alert_type: string;
        metric: string;
        threshold_percent: number;
        message: string;
        triggered_at: string;
    }>>;
    /**
     * Get usage trends for analytics
     */
    getUsageTrends(tenantId: string, months?: number): Promise<Array<{
        period: string;
        metrics: UsageMetrics;
    }>>;
}
export declare const billingService: BillingService;
export default billingService;
//# sourceMappingURL=billingService.d.ts.map