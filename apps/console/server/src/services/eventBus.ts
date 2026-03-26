/**
 * Event Bus Service
 * 
 * Singleton event bus that bridges between Vienna's governance engine
 * and SSE clients. Provides pub/sub pattern for real-time events.
 */

import type { EnhancedSSEEvent, EventSeverity, GovernanceEventType } from '../sse/eventStream.js';
import { eventStream } from '../sse/eventStream.js';

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

class EventBusService {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventCounts: { [key: string]: number } = {};
  private eventRates: { timestamp: number; count: number }[] = [];
  private totalEventsEmitted = 0;
  private totalEventsHandled = 0;

  constructor() {
    // Clean up old rate tracking data every minute
    setInterval(() => {
      this.cleanupRateTracking();
    }, 60 * 1000);
  }

  /**
   * Emit an event to all subscribers and SSE clients
   */
  emit<T = unknown>(
    type: GovernanceEventType,
    data: T,
    tenantId: string,
    severity: EventSeverity = 'info'
  ): void {
    const event: EnhancedSSEEvent<T> = {
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
  subscribe<T = unknown>(
    handler: EventHandler<T>,
    options: {
      eventType?: GovernanceEventType;
      tenantId?: string;
    } = {}
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      eventType: options.eventType,
      tenantId: options.tenantId,
      handler: handler as EventHandler,
    });

    console.log(`[EventBus] New subscription ${subscriptionId} (type: ${options.eventType || 'all'}, tenant: ${options.tenantId || 'all'})`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId);
    if (removed) {
      console.log(`[EventBus] Removed subscription ${subscriptionId}`);
    }
    return removed;
  }

  /**
   * Get event bus statistics
   */
  getStats(): EventBusStats {
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
  getEventCounts(): { [type: string]: number } {
    return { ...this.eventCounts };
  }

  /**
   * Clear all subscriptions (for testing/cleanup)
   */
  clearSubscriptions(): void {
    this.subscriptions.clear();
    console.log('[EventBus] Cleared all subscriptions');
  }

  /**
   * Emit convenience methods for common governance events
   */
  
  emitIntentSubmitted(data: {
    intent_id: string;
    agent_id: string;
    action: string;
    risk_tier: string;
  }, tenantId: string): void {
    this.emit('intent.submitted', data, tenantId, 'info');
  }

  emitIntentApproved(data: {
    intent_id: string;
    warrant_id: string;
    approved_by?: string;
    risk_tier: string;
  }, tenantId: string): void {
    this.emit('intent.approved', data, tenantId, 'info');
  }

  emitIntentDenied(data: {
    intent_id: string;
    reason: string;
    risk_tier: string;
  }, tenantId: string): void {
    this.emit('intent.denied', data, tenantId, 'warning');
  }

  emitWarrantIssued(data: {
    warrant_id: string;
    intent_id: string;
    agent_id: string;
    expires_at: string;
    risk_tier: string;
  }, tenantId: string): void {
    this.emit('warrant.issued', data, tenantId, 'info');
  }

  emitWarrantExpired(data: {
    warrant_id: string;
    expired_at: string;
    was_used: boolean;
  }, tenantId: string): void {
    this.emit('warrant.expired', data, tenantId, 'warning');
  }

  emitWarrantTampered(data: {
    warrant_id: string;
    tamper_type: string;
    detected_at: string;
    agent_id?: string;
  }, tenantId: string): void {
    this.emit('warrant.tampered', data, tenantId, 'critical');
  }

  emitAgentRegistered(data: {
    agent_id: string;
    framework: string;
    capabilities: string[];
  }, tenantId: string): void {
    this.emit('agent.registered', data, tenantId, 'info');
  }

  emitAgentHeartbeat(data: {
    agent_id: string;
    status: 'healthy' | 'degraded' | 'unresponsive';
    last_seen: string;
  }, tenantId: string): void {
    const severity = data.status === 'healthy' ? 'info' : 
                     data.status === 'degraded' ? 'warning' : 'critical';
    this.emit('agent.heartbeat', data, tenantId, severity);
  }

  emitAgentTrustChanged(data: {
    agent_id: string;
    old_score: number;
    new_score: number;
    reason: string;
  }, tenantId: string): void {
    const severity = data.new_score < data.old_score ? 'warning' : 'info';
    this.emit('agent.trust_changed', data, tenantId, severity);
  }

  emitExecutionStarted(data: {
    execution_id: string;
    warrant_id: string;
    agent_id: string;
    action: string;
  }, tenantId: string): void {
    this.emit('execution.started', data, tenantId, 'info');
  }

  emitExecutionCompleted(data: {
    execution_id: string;
    warrant_id: string;
    duration_ms: number;
    success: boolean;
    output?: string;
  }, tenantId: string): void {
    const severity = data.success ? 'info' : 'warning';
    this.emit('execution.completed', data, tenantId, severity);
  }

  emitScopeDrift(data: {
    execution_id: string;
    warrant_id: string;
    expected_action: string;
    actual_action: string;
    drift_severity: 'minor' | 'major' | 'critical';
  }, tenantId: string): void {
    const severity = data.drift_severity === 'minor' ? 'warning' : 'critical';
    this.emit('execution.scope_drift', data, tenantId, severity);
  }

  emitApprovalRequired(data: {
    approval_id: string;
    intent_id: string;
    risk_tier: string;
    required_approvers: number;
    expires_at: string;
  }, tenantId: string): void {
    this.emit('approval.required', data, tenantId, 'warning');
  }

  emitApprovalResolved(data: {
    approval_id: string;
    intent_id: string;
    decision: 'approved' | 'denied';
    approved_by: string;
    resolved_at: string;
  }, tenantId: string): void {
    this.emit('approval.resolved', data, tenantId, 'info');
  }

  emitPolicyEvaluated(data: {
    policy_id: string;
    intent_id: string;
    result: 'allow' | 'deny' | 'require_approval';
    evaluation_time_ms: number;
  }, tenantId: string): void {
    this.emit('policy.evaluated', data, tenantId, 'info');
  }

  emitPolicyConflict(data: {
    policy_ids: string[];
    intent_id: string;
    conflict_type: string;
    resolution?: string;
  }, tenantId: string): void {
    this.emit('policy.conflict', data, tenantId, 'critical');
  }

  /**
   * Private methods
   */

  private notifySubscribers(event: EnhancedSSEEvent): void {
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
      } catch (error) {
        console.error(`[EventBus] Error in subscription ${subscription.id}:`, error);
      }
    }

    this.totalEventsHandled += handledCount;
  }

  private trackEventRate(): void {
    this.eventRates.push({
      timestamp: Date.now(),
      count: 1,
    });

    // Keep only last hour of data
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.eventRates = this.eventRates.filter(e => e.timestamp > oneHourAgo);
  }

  private cleanupRateTracking(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.eventRates = this.eventRates.filter(e => e.timestamp > oneHourAgo);
  }
}

// Singleton instance
export const eventBus = new EventBusService();