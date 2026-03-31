/**
 * System "Now" Types
 * Phase 5E: Operator "Now" View
 *
 * Unified snapshot of current execution state.
 */
import type { SystemState } from './api.js';
import type { ProviderHealthState } from '../services/providerHealthService.js';
/**
 * Activity event types for live feed
 */
export type ActivityEventType = 'execution.started' | 'execution.completed' | 'execution.failed' | 'objective.created' | 'objective.completed' | 'objective.failed' | 'alert.created' | 'provider.degraded' | 'provider.recovered' | 'system.paused' | 'system.resumed';
/**
 * Live activity event
 */
export interface ActivityEvent {
    type: ActivityEventType;
    timestamp: string;
    summary: string;
    envelopeId?: string;
    objectiveId?: string;
    provider?: string;
    severity?: 'info' | 'warning' | 'critical';
    details?: Record<string, unknown>;
}
/**
 * Currently executing work item
 */
export interface CurrentWorkItem {
    objectiveId: string;
    objectiveName: string;
    envelopeId: string;
    provider?: string;
    adapter?: string;
    runtimeMs: number;
    attempt: number;
    maxAttempts: number;
    stalled: boolean;
    blocked: boolean;
    startedAt: string;
}
/**
 * Attention-worthy item
 */
export interface AttentionItem {
    type: 'alert' | 'stalled' | 'retry_loop' | 'dead_letter' | 'degraded_provider' | 'queue_capacity';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    since: string;
    count?: number;
    objectiveId?: string;
    envelopeId?: string;
    provider?: string;
    actionable: boolean;
}
/**
 * Provider health summary
 */
export interface ProviderHealthSummary {
    healthy: number;
    degraded: number;
    unavailable: number;
    unknown: number;
    providers: Array<{
        name: string;
        state: ProviderHealthState;
        lastRequestAt?: string;
        failureRate: number;
    }>;
}
/**
 * Queue health snapshot
 */
export interface QueueHealthSnapshot {
    depth: number;
    executing: number;
    blocked: number;
    retryWait: number;
    nearCapacity: boolean;
    healthy: boolean;
}
/**
 * Recent failures snapshot
 */
export interface RecentFailures {
    count: number;
    uniqueEnvelopes: number;
    failureRate: number;
    topErrors: Array<{
        error: string;
        count: number;
        lastSeen: string;
    }>;
}
/**
 * System telemetry freshness
 */
export interface TelemetryFreshness {
    live: boolean;
    lastEventAt?: string;
    snapshotAge: number;
    degraded: boolean;
}
/**
 * Unified system "now" snapshot
 */
export interface SystemNowSnapshot {
    timestamp: string;
    systemState: SystemState;
    paused: boolean;
    pauseReason?: string;
    currentActivity: {
        executingEnvelopes: number;
        activeObjectives: number;
        queueDepth: number;
    };
    queueHealth: QueueHealthSnapshot;
    currentWork: CurrentWorkItem[];
    recentEvents: ActivityEvent[];
    recentFailures: RecentFailures;
    deadLetters: {
        count: number;
        recentCount: number;
        growing: boolean;
    };
    providerHealth: ProviderHealthSummary;
    attention: AttentionItem[];
    telemetry: TelemetryFreshness;
}
/**
 * System "now" response
 */
export interface SystemNowResponse {
    success: boolean;
    data?: SystemNowSnapshot;
    error?: string;
    timestamp: string;
}
//# sourceMappingURL=systemNow.d.ts.map