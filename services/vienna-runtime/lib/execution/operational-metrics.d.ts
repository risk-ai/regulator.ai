export = OperationalMetrics;
/**
 * Phase 7.4 Stage 5: Operational Metrics Surface
 *
 * Purpose: Provide structured metrics for operator inspection and later Phase 8 UI use.
 *
 * Design:
 * - Derives metrics from execution events and state
 * - No unaudited side-state when possible
 * - Exposes pause state, health state, queue depth, rates
 */
declare class OperationalMetrics {
    /**
     * Collect operational metrics from executor
     *
     * @param {object} executor - QueuedExecutor instance
     * @returns {object} Comprehensive metrics snapshot
     */
    static collect(executor: object): object;
    /**
     * Collect agent-specific metrics
     */
    static _collectAgentMetrics(budgetState: any, rateLimiterState: any): {};
    /**
     * Compute failure rate
     */
    static _computeFailureRate(queueStats: any, dlqStats: any): number;
    /**
     * Compute retry rate
     */
    static _computeRetryRate(queueStats: any): number;
    /**
     * Format metrics for display
     *
     * @param {object} metrics - Raw metrics
     * @returns {string} Formatted metrics summary
     */
    static formatSummary(metrics: object): string;
}
//# sourceMappingURL=operational-metrics.d.ts.map