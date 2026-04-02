/**
 * Runtime Stats Service
 * Phase 5C: Runtime Statistics Surface
 *
 * Aggregates system-wide execution metrics for operator visibility.
 * Calculates rolling time windows, latency percentiles, and provider health.
 */
import type { RuntimeStats, TimeWindow } from '../types/runtimeStats.js';
import type { ViennaRuntimeService } from './viennaRuntime.js';
export declare class RuntimeStatsService {
    private viennaRuntime;
    private providerManager?;
    private executionHistory;
    private maxHistorySize;
    constructor(viennaRuntime: ViennaRuntimeService, providerManager?: any);
    /**
     * Get runtime statistics for time window
     */
    getRuntimeStats(timeWindow?: TimeWindow): Promise<RuntimeStats>;
    /**
     * Get queue statistics (current snapshot)
     */
    private getQueueStats;
    /**
     * Get execution statistics (rolling window)
     */
    private getExecutionStats;
    /**
     * Get latency statistics (rolling window)
     */
    private getLatencyStats;
    /**
     * Get objective statistics (current snapshot)
     */
    private getObjectiveStats;
    /**
     * Get provider statistics (rolling window)
     */
    private getProviderStats;
    /**
     * Record execution for rolling window calculations
     */
    recordExecution(execution: {
        success: boolean;
        durationMs: number;
        provider?: string;
    }): void;
    /**
     * Cleanup old execution records (called periodically)
     */
    cleanup(maxAgeMs?: number): void;
    /**
     * Calculate percentile
     */
    private percentile;
    /**
     * Get window duration in milliseconds
     */
    private getWindowMs;
    /**
     * Empty stats for graceful degradation
     */
    private emptyQueueStats;
    private emptyExecutionStats;
    private emptyLatencyStats;
    private emptyObjectiveStats;
}
//# sourceMappingURL=runtimeStatsService.d.ts.map