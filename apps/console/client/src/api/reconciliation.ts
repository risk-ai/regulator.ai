/**
 * Reconciliation API Client
 * 
 * Phase 10.5: Frontend client for reconciliation visibility endpoints
 */

import { apiClient } from './client.js';

export interface ExecutionLease {
  objective_id: string;
  attempt_id: string;
  generation: number;
  started_at: string;
  deadline_at: string;
  seconds_remaining: number;
}

export interface TimelineEvent {
  timestamp: string;
  objective_id: string;
  generation: number | null;
  event_type: string;
  summary: string;
  metadata?: any;
}

export interface CircuitBreaker {
  objective_id: string;
  consecutive_failures: number;
  policy_limit: number;
  reconciliation_status: string;
  cooldown_until: string | null;
  cooldown_remaining_seconds: number | null;
  last_failure_reason: string | null;
}

export interface ReconciliationMetrics {
  timeouts_per_hour: number;
  cooldown_entries_per_hour: number;
  degraded_transitions_per_hour: number;
  reconciliations_per_hour: number;
  avg_execution_duration_ms: number | null;
  max_execution_duration_ms: number | null;
  expired_deadlines: number;
  stale_completions_ignored: number;
}

export const reconciliationApi = {
  /**
   * Get active execution leases
   */
  async getExecutionLeases(): Promise<{ active_leases: ExecutionLease[]; total: number }> {
    return await apiClient.get<{ active_leases: ExecutionLease[]; total: number }>('/reconciliation/leases');
  },

  /**
   * Get reconciliation timeline events
   */
  async getTimeline(limit: number = 100): Promise<{ events: TimelineEvent[]; total: number; limit: number }> {
    return await apiClient.get<{ events: TimelineEvent[]; total: number; limit: number }>('/reconciliation/timeline', {
      limit,
    });
  },

  /**
   * Get circuit breaker status
   */
  async getCircuitBreakers(): Promise<{ breakers: CircuitBreaker[]; total: number }> {
    return await apiClient.get<{ breakers: CircuitBreaker[]; total: number }>('/reconciliation/breakers');
  },

  /**
   * Get reconciliation metrics
   */
  async getMetrics(): Promise<ReconciliationMetrics> {
    return await apiClient.get<ReconciliationMetrics>('/reconciliation/metrics');
  },
};
