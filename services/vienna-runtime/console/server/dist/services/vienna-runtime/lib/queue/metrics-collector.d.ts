/**
 * Phase 16.4 Stage 5 — Metrics Collector
 *
 * Queue health metrics and operational observability.
 */
export type QueueMetrics = {
    timestamp: string;
    total_depth: number;
    depth_by_state: Record<string, number>;
    depth_by_priority: Record<string, number>;
    running_count: number;
    leased_count: number;
    active_claims: number;
    abandoned_claims: number;
    avg_queue_wait_ms?: number;
    p95_queue_wait_ms?: number;
    recovery_events_24h: number;
    fail_closed_count: number;
    active_workers: number;
    stale_workers: number;
};
export declare class MetricsCollector {
    private stateGraph;
    private repository;
    private leaseManager;
    private claimManager;
    initialize(): Promise<void>;
    /**
     * Collect current queue metrics
     */
    collect(): Promise<QueueMetrics>;
    /**
     * Log current metrics to console (structured JSON)
     */
    logMetrics(): Promise<void>;
    /**
     * Get operator-visible queue summary
     */
    getQueueSummary(): Promise<{
        healthy: boolean;
        warnings: string[];
        summary: string;
        metrics: QueueMetrics;
    }>;
}
//# sourceMappingURL=metrics-collector.d.ts.map