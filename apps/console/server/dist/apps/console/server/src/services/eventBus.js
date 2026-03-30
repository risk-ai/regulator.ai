/**
 * Event Bus Service
 *
 * Singleton event bus that bridges between Vienna's governance engine
 * and SSE clients. Provides pub/sub pattern for real-time events.
 */
import { eventStream } from '../sse/eventStream.js';
class EventBusService {
    subscriptions = new Map();
    eventCounts = {};
    eventRates = [];
    totalEventsEmitted = 0;
    totalEventsHandled = 0;
    constructor() {
        // Clean up old rate tracking data every minute
        setInterval(() => {
            this.cleanupRateTracking();
        }, 60 * 1000);
    }
    /**
     * Emit an event to all subscribers and SSE clients
     */
    emit(type, data, tenantId, severity = 'info') {
        const event = {
            type,
            timestamp: new Date().toISOString(),
            data,
            tenant_id: tenantId,
            severity,
        };
        this.totalEventsEmitted++;
        this.eventCounts[type] = (this.eventCounts[type] || 0) + 1;
        this.trackEventRate();
        // Send to SSE clients
        eventStream.publishEnhanced(event);
        // Send to internal subscribers
        this.notifySubscribers(event);
        console.log(`[EventBus] Emitted ${type} event for tenant ${tenantId} (severity: ${severity})`);
    }
    /**
     * Subscribe to events with optional filtering
     */
    subscribe(handler, options = {}) {
        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            eventType: options.eventType,
            tenantId: options.tenantId,
            handler: handler,
        });
        console.log(`[EventBus] New subscription ${subscriptionId} (type: ${options.eventType || 'all'}, tenant: ${options.tenantId || 'all'})`);
        return subscriptionId;
    }
    /**
     * Unsubscribe from events
     */
    unsubscribe(subscriptionId) {
        const removed = this.subscriptions.delete(subscriptionId);
        if (removed) {
            console.log(`[EventBus] Removed subscription ${subscriptionId}`);
        }
        return removed;
    }
    /**
     * Get event bus statistics
     */
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;
        const lastMinuteEvents = this.eventRates.filter(e => e.timestamp > oneMinuteAgo).length;
        const lastHourEvents = this.eventRates.filter(e => e.timestamp > oneHourAgo).length;
        const sseStats = eventStream.getEventStats();
        return {
            totalEventsEmitted: this.totalEventsEmitted,
            totalEventsHandled: this.totalEventsHandled,
            eventRates: {
                lastMinute: lastMinuteEvents,
                lastHour: lastHourEvents,
            },
            activeSubscriptions: this.subscriptions.size,
            connectedClients: sseStats.connectedClients,
            recentEvents: sseStats.totalEvents,
        };
    }
    /**
     * Get event counts by type
     */
    getEventCounts() {
        return { ...this.eventCounts };
    }
    /**
     * Clear all subscriptions (for testing/cleanup)
     */
    clearSubscriptions() {
        this.subscriptions.clear();
        console.log('[EventBus] Cleared all subscriptions');
    }
    /**
     * Emit convenience methods for common governance events
     */
    emitIntentSubmitted(data, tenantId) {
        this.emit('intent.submitted', data, tenantId, 'info');
    }
    emitIntentApproved(data, tenantId) {
        this.emit('intent.approved', data, tenantId, 'info');
    }
    emitIntentDenied(data, tenantId) {
        this.emit('intent.denied', data, tenantId, 'warning');
    }
    emitWarrantIssued(data, tenantId) {
        this.emit('warrant.issued', data, tenantId, 'info');
    }
    emitWarrantExpired(data, tenantId) {
        this.emit('warrant.expired', data, tenantId, 'warning');
    }
    emitWarrantTampered(data, tenantId) {
        this.emit('warrant.tampered', data, tenantId, 'critical');
    }
    emitAgentRegistered(data, tenantId) {
        this.emit('agent.registered', data, tenantId, 'info');
    }
    emitAgentHeartbeat(data, tenantId) {
        const severity = data.status === 'healthy' ? 'info' :
            data.status === 'degraded' ? 'warning' : 'critical';
        this.emit('agent.heartbeat', data, tenantId, severity);
    }
    emitAgentTrustChanged(data, tenantId) {
        const severity = data.new_score < data.old_score ? 'warning' : 'info';
        this.emit('agent.trust_changed', data, tenantId, severity);
    }
    emitExecutionStarted(data, tenantId) {
        this.emit('execution.started', data, tenantId, 'info');
    }
    emitExecutionCompleted(data, tenantId) {
        const severity = data.success ? 'info' : 'warning';
        this.emit('execution.completed', data, tenantId, severity);
    }
    emitScopeDrift(data, tenantId) {
        const severity = data.drift_severity === 'minor' ? 'warning' : 'critical';
        this.emit('execution.scope_drift', data, tenantId, severity);
    }
    emitApprovalRequired(data, tenantId) {
        this.emit('approval.required', data, tenantId, 'warning');
    }
    emitApprovalResolved(data, tenantId) {
        this.emit('approval.resolved', data, tenantId, 'info');
    }
    emitPolicyEvaluated(data, tenantId) {
        this.emit('policy.evaluated', data, tenantId, 'info');
    }
    emitPolicyConflict(data, tenantId) {
        this.emit('policy.conflict', data, tenantId, 'critical');
    }
    /**
     * Private methods
     */
    notifySubscribers(event) {
        let handledCount = 0;
        for (const subscription of this.subscriptions.values()) {
            // Check event type filter
            if (subscription.eventType && subscription.eventType !== event.type) {
                continue;
            }
            // Check tenant filter
            if (subscription.tenantId && subscription.tenantId !== event.tenant_id) {
                continue;
            }
            try {
                subscription.handler(event);
                handledCount++;
            }
            catch (error) {
                console.error(`[EventBus] Error in subscription ${subscription.id}:`, error);
            }
        }
        this.totalEventsHandled += handledCount;
    }
    trackEventRate() {
        this.eventRates.push({
            timestamp: Date.now(),
            count: 1,
        });
        // Keep only last hour of data
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.eventRates = this.eventRates.filter(e => e.timestamp > oneHourAgo);
    }
    cleanupRateTracking() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        this.eventRates = this.eventRates.filter(e => e.timestamp > oneHourAgo);
    }
}
// Singleton instance
export const eventBus = new EventBusService();
//# sourceMappingURL=eventBus.js.map