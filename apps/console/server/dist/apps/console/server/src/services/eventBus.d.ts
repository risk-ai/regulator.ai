/**
 * Event Bus Service
 *
 * Singleton event bus that bridges between Vienna's governance engine
 * and SSE clients. Provides pub/sub pattern for real-time events.
 */
import type { EnhancedSSEEvent, EventSeverity, GovernanceEventType } from '../sse/eventStream.js';
export interface EventHandler<T = unknown> {
    (event: EnhancedSSEEvent<T>): void | Promise<void>;
}
export interface EventSubscription {
    id: string;
    eventType?: GovernanceEventType;
    tenantId?: string;
    handler: EventHandler;
}
export interface EventBusStats {
    totalEventsEmitted: number;
    totalEventsHandled: number;
    eventRates: {
        lastMinute: number;
        lastHour: number;
    };
    activeSubscriptions: number;
    connectedClients: number;
    recentEvents: number;
}
declare class EventBusService {
    private subscriptions;
    private eventCounts;
    private eventRates;
    private totalEventsEmitted;
    private totalEventsHandled;
    constructor();
    /**
     * Emit an event to all subscribers and SSE clients
     */
    emit<T = unknown>(type: GovernanceEventType, data: T, tenantId: string, severity?: EventSeverity): void;
    /**
     * Subscribe to events with optional filtering
     */
    subscribe<T = unknown>(handler: EventHandler<T>, options?: {
        eventType?: GovernanceEventType;
        tenantId?: string;
    }): string;
    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriptionId: string): boolean;
    /**
     * Get event bus statistics
     */
    getStats(): EventBusStats;
    /**
     * Get event counts by type
     */
    getEventCounts(): {
        [type: string]: number;
    };
    /**
     * Clear all subscriptions (for testing/cleanup)
     */
    clearSubscriptions(): void;
    /**
     * Emit convenience methods for common governance events
     */
    emitIntentSubmitted(data: {
        intent_id: string;
        agent_id: string;
        action: string;
        risk_tier: string;
    }, tenantId: string): void;
    emitIntentApproved(data: {
        intent_id: string;
        warrant_id: string;
        approved_by?: string;
        risk_tier: string;
    }, tenantId: string): void;
    emitIntentDenied(data: {
        intent_id: string;
        reason: string;
        risk_tier: string;
    }, tenantId: string): void;
    emitWarrantIssued(data: {
        warrant_id: string;
        intent_id: string;
        agent_id: string;
        expires_at: string;
        risk_tier: string;
    }, tenantId: string): void;
    emitWarrantExpired(data: {
        warrant_id: string;
        expired_at: string;
        was_used: boolean;
    }, tenantId: string): void;
    emitWarrantTampered(data: {
        warrant_id: string;
        tamper_type: string;
        detected_at: string;
        agent_id?: string;
    }, tenantId: string): void;
    emitAgentRegistered(data: {
        agent_id: string;
        framework: string;
        capabilities: string[];
    }, tenantId: string): void;
    emitAgentHeartbeat(data: {
        agent_id: string;
        status: 'healthy' | 'degraded' | 'unresponsive';
        last_seen: string;
    }, tenantId: string): void;
    emitAgentTrustChanged(data: {
        agent_id: string;
        old_score: number;
        new_score: number;
        reason: string;
    }, tenantId: string): void;
    emitExecutionStarted(data: {
        execution_id: string;
        warrant_id: string;
        agent_id: string;
        action: string;
    }, tenantId: string): void;
    emitExecutionCompleted(data: {
        execution_id: string;
        warrant_id: string;
        duration_ms: number;
        success: boolean;
        output?: string;
    }, tenantId: string): void;
    emitScopeDrift(data: {
        execution_id: string;
        warrant_id: string;
        expected_action: string;
        actual_action: string;
        drift_severity: 'minor' | 'major' | 'critical';
    }, tenantId: string): void;
    emitApprovalRequired(data: {
        approval_id: string;
        intent_id: string;
        risk_tier: string;
        required_approvers: number;
        expires_at: string;
    }, tenantId: string): void;
    emitApprovalResolved(data: {
        approval_id: string;
        intent_id: string;
        decision: 'approved' | 'denied';
        approved_by: string;
        resolved_at: string;
    }, tenantId: string): void;
    emitPolicyEvaluated(data: {
        policy_id: string;
        intent_id: string;
        result: 'allow' | 'deny' | 'require_approval';
        evaluation_time_ms: number;
    }, tenantId: string): void;
    emitPolicyConflict(data: {
        policy_ids: string[];
        intent_id: string;
        conflict_type: string;
        resolution?: string;
    }, tenantId: string): void;
    /**
     * Private methods
     */
    private notifySubscribers;
    private trackEventRate;
    private cleanupRateTracking;
}
export declare const eventBus: EventBusService;
export {};
//# sourceMappingURL=eventBus.d.ts.map