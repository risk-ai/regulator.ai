/**
 * Runtime Statistics Types
 * Phase 5C: Runtime Statistics Surface
 * 
 * System-wide health and performance metrics.
 */

export type TimeWindow = '5m' | '15m' | '1h' | '24h';
export type ProviderHealth = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

/**
 * Runtime Statistics Snapshot
 */
export interface RuntimeStats {
  timestamp: string; // ISO 8601
  timeWindow: TimeWindow;
  
  queue: QueueStats;
  execution: ExecutionStats;
  latency: LatencyStats;
  objectives: ObjectiveStats;
  providers: ProviderStats;
  
  degraded: boolean; // True if some metrics unavailable
  degradedReasons?: string[];
}

/**
 * Queue Statistics
 */
export interface QueueStats {
  depth: number; // Total items in queue
  queued: number; // Waiting to execute
  executing: number; // Currently running
  retryWait: number; // Waiting for retry
  blocked: number; // Blocked (recursion/budget)
}

/**
 * Execution Statistics
 */
export interface ExecutionStats {
  totalExecuted: number;
  totalFailed: number;
  totalRetried: number;
  successRate: number; // 0-100
  throughputPerMinute: number;
}

/**
 * Latency Statistics
 */
export interface LatencyStats {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  
  // Optional: latency breakdown by category
  byCategory?: {
    [category: string]: {
      avgMs: number;
      p95Ms: number;
    };
  };
}

/**
 * Objective Statistics
 */
export interface ObjectiveStats {
  active: number;
  blocked: number;
  completed: number;
  failed: number;
}

/**
 * Provider Statistics
 */
export interface ProviderStats {
  [providerName: string]: ProviderMetrics;
}

/**
 * Individual Provider Metrics
 */
export interface ProviderMetrics {
  requests: number;
  failures: number;
  avgLatencyMs: number;
  health: ProviderHealth;
  lastRequestAt?: string; // ISO 8601
}

/**
 * Runtime Stats Query Parameters
 */
export interface RuntimeStatsQuery {
  window?: TimeWindow;
}

/**
 * Runtime Stats Response
 */
export interface RuntimeStatsResponse {
  success: boolean;
  data?: RuntimeStats;
  error?: string;
  timestamp: string;
}
