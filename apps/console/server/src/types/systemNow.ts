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
export type ActivityEventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'objective.created'
  | 'objective.completed'
  | 'objective.failed'
  | 'alert.created'
  | 'provider.degraded'
  | 'provider.recovered'
  | 'system.paused'
  | 'system.resumed';

/**
 * Live activity event
 */
export interface ActivityEvent {
  type: ActivityEventType;
  timestamp: string; // ISO 8601
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
  runtimeMs: number; // How long has it been executing
  attempt: number;
  maxAttempts: number;
  stalled: boolean; // Running longer than expected
  blocked: boolean;
  startedAt: string; // ISO 8601
}

/**
 * Attention-worthy item
 */
export interface AttentionItem {
  type: 'alert' | 'stalled' | 'retry_loop' | 'dead_letter' | 'degraded_provider' | 'queue_capacity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  since: string; // ISO 8601
  count?: number; // For aggregated items
  objectiveId?: string;
  envelopeId?: string;
  provider?: string;
  actionable: boolean; // Can operator take action?
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
    failureRate: number; // 0-100
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
  nearCapacity: boolean; // Queue depth > threshold
  healthy: boolean;
}

/**
 * Recent failures snapshot
 */
export interface RecentFailures {
  count: number; // Total failures in window
  uniqueEnvelopes: number;
  failureRate: number; // Failures / total executions (0-100)
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
  live: boolean; // Is SSE connected?
  lastEventAt?: string; // ISO 8601
  snapshotAge: number; // Milliseconds since snapshot created
  degraded: boolean; // Is telemetry stale?
}

/**
 * Unified system "now" snapshot
 */
export interface SystemNowSnapshot {
  timestamp: string; // ISO 8601
  
  // System status
  systemState: SystemState;
  paused: boolean;
  pauseReason?: string;
  
  // Current activity summary
  currentActivity: {
    executingEnvelopes: number;
    activeObjectives: number;
    queueDepth: number;
  };
  
  // Queue health (from Phase 5C)
  queueHealth: QueueHealthSnapshot;
  
  // Active work
  currentWork: CurrentWorkItem[];
  
  // Recent activity feed (last 50 events)
  recentEvents: ActivityEvent[];
  
  // Recent failures
  recentFailures: RecentFailures;
  
  // Dead letters
  deadLetters: {
    count: number;
    recentCount: number; // Added in last hour
    growing: boolean; // Increasing over time
  };
  
  // Provider health summary (from Phase 5D)
  providerHealth: ProviderHealthSummary;
  
  // Active alerts and attention items
  attention: AttentionItem[];
  
  // Telemetry freshness
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
