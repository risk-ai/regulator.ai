/**
 * Providers API Client
 * Phase 5D: Provider Health Truthfulness
 * 
 * Provider health and status endpoints
 */

import { apiClient } from './client.js';

export type ProviderHealthState = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ProviderHealthTransition {
  from: ProviderHealthState;
  to: ProviderHealthState;
  timestamp: string;
  reason: string;
}

export interface ProviderHealthMetrics {
  requestCount: number;
  failureCount: number;
  timeoutCount: number;
  avgLatencyMs: number;
  successRate: number; // 0-100
}

export interface ProviderHealthDetail {
  provider: string;
  status: ProviderHealthState;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  latencyMs: number | null;
  errorRate: number | null;
  consecutiveFailures: number;
  metrics: ProviderHealthMetrics;
  activeExecutions: number;
  staleTelemetry: boolean;
  lastErrorMessage?: string;
  transitions: ProviderHealthTransition[];
}

export interface ProvidersHealthSnapshot {
  timestamp: string;
  providers: Record<string, ProviderHealthDetail>;
  degraded: boolean;
  degradedReasons?: string[];
}

export const providersApi = {
  /**
   * Get comprehensive health for all providers
   */
  async getHealth(): Promise<ProvidersHealthSnapshot> {
    return apiClient.get<ProvidersHealthSnapshot>('/system/providers/health');
  },

  /**
   * Get detailed health for specific provider
   */
  async getProviderHealth(providerName: string): Promise<ProviderHealthDetail> {
    return apiClient.get<ProviderHealthDetail>(`/system/providers/${providerName}/health`);
  },
};
