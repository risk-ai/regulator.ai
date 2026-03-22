/**
 * Runtime API Client
 * 
 * Real-time execution visibility.
 */

import { apiClient } from './client.js';

export interface RuntimeEnvelope {
  envelope_id: string;
  objective_id: string;
  parent_envelope_id?: string;
  action_type: string;
  target: string;
  state: string;
  warrant_id?: string;
  verification_status?: string;
  retry_count: number;
  dead_letter: boolean;
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  payload?: any;
}

export interface ObjectiveExecution {
  objective_id: string;
  title: string;
  status: string;
  envelopes: Array<{
    envelope_id: string;
    parent_envelope_id?: string;
    action_type: string;
    target: string;
    state: string;
    warrant_id?: string;
    verification_status?: string;
    retry_count: number;
    queued_at: string;
    started_at?: string;
    completed_at?: string;
  }>;
  execution_tree: Array<{
    envelope_id: string;
    children: string[];
    depth: number;
  }>;
}

/**
 * List all envelopes
 */
export async function listEnvelopes(params?: {
  limit?: number;
  status?: string;
  objectiveId?: string;
}): Promise<RuntimeEnvelope[]> {
  return apiClient.get<RuntimeEnvelope[]>('/runtime/envelopes', params as any);
}

/**
 * Get envelope detail
 */
export async function getEnvelope(id: string): Promise<RuntimeEnvelope> {
  return apiClient.get<RuntimeEnvelope>(`/runtime/envelopes/${id}`);
}

/**
 * Get execution tree for objective
 */
export async function getObjectiveExecution(id: string): Promise<ObjectiveExecution> {
  return apiClient.get<ObjectiveExecution>(`/runtime/objectives/${id}/execution`);
}

/**
 * Runtime Statistics (Phase 5C)
 */
export interface RuntimeStats {
  timestamp: string;
  timeWindow: '5m' | '15m' | '1h' | '24h';
  queue: {
    depth: number;
    queued: number;
    executing: number;
    retryWait: number;
    blocked: number;
  };
  execution: {
    totalExecuted: number;
    totalFailed: number;
    totalRetried: number;
    successRate: number;
    throughputPerMinute: number;
  };
  latency: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  objectives: {
    active: number;
    blocked: number;
    completed: number;
    failed: number;
  };
  providers: {
    [name: string]: {
      requests: number;
      failures: number;
      avgLatencyMs: number;
      health: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
    };
  };
  degraded: boolean;
  degradedReasons?: string[];
}

/**
 * Get runtime statistics
 */
export async function getRuntimeStats(window: '5m' | '15m' | '1h' | '24h' = '5m'): Promise<RuntimeStats> {
  return apiClient.get<RuntimeStats>('/runtime/stats', { window });
}

export const runtimeApi = {
  listEnvelopes,
  getEnvelope,
  getObjectiveExecution,
  getRuntimeStats,
};
