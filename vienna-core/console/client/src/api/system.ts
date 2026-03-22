/**
 * System API Client
 * 
 * System status and health endpoints
 */

import { apiClient } from './client.js';
import type { SystemStatus } from './types.js';

export interface ServiceStatus {
  service: string;
  status: 'running' | 'degraded' | 'stopped' | 'unknown';
  lastHeartbeatAt?: string;
  connectivity?: 'healthy' | 'degraded' | 'offline';
  restartable: boolean;
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  lastCheckedAt: string;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  cooldownUntil?: string | null;
  latencyMs?: number | null;
  consecutiveFailures: number;
}

export interface ProvidersResponse {
  primary: string;
  fallback: string[];
  providers: Record<string, ProviderHealth>;
}

// Phase 5E: System "Now" View Types
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

export interface ProviderHealthSummary {
  healthy: number;
  degraded: number;
  unavailable: number;
  unknown: number;
  providers: Array<{
    name: string;
    state: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    lastRequestAt?: string;
    failureRate: number;
  }>;
}

export interface QueueHealthSnapshot {
  depth: number;
  executing: number;
  blocked: number;
  retryWait: number;
  nearCapacity: boolean;
  healthy: boolean;
}

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

export interface TelemetryFreshness {
  live: boolean;
  lastEventAt?: string;
  snapshotAge: number;
  degraded: boolean;
}

export interface SystemNowSnapshot {
  timestamp: string;
  systemState: 'healthy' | 'degraded' | 'critical' | 'offline';
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

export const systemApi = {
  /**
   * Get system status
   */
  async getStatus(): Promise<SystemStatus> {
    return apiClient.get<SystemStatus>('/system/status');
  },

  /**
   * Get services status
   */
  async getServices(): Promise<ServiceStatus[]> {
    return apiClient.get<ServiceStatus[]>('/system/services');
  },

  /**
   * Get providers status
   */
  async getProviders(): Promise<ProvidersResponse> {
    return apiClient.get<ProvidersResponse>('/system/providers');
  },

  /**
   * Restart service
   */
  async restartService(serviceName: string, operator: string): Promise<{
    objective_id: string;
    status: 'preview' | 'executing' | 'failed';
    message: string;
  }> {
    return apiClient.post(`/system/services/${serviceName}/restart`, { operator });
  },

  /**
   * Get unified system "now" view
   * Phase 5E: Operator command center
   */
  async getSystemNow(): Promise<SystemNowSnapshot> {
    return apiClient.get<SystemNowSnapshot>('/system/now');
  },
};
