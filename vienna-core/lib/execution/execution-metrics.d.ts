/**
 * Execution Metrics
 *
 * Phase 4E: Tracks execution time metrics for envelopes.
 * Provides latency percentiles, timeout rates, and slow execution detection.
 */
export class ExecutionMetrics {
    constructor(options?: {});
    metrics: Map<any, any>;
    allExecutions: any[];
    maxHistorySize: any;
    timeoutRateThreshold: any;
    slowExecutionThreshold: any;
    totalExecutions: number;
    totalTimeouts: number;
    totalFailures: number;
    totalSuccess: number;
    /**
     * Record execution start
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} objectiveId - Objective ID (optional)
     * @param {number} timeoutMs - Configured timeout
     * @returns {object} Tracking token
     */
    recordStart(envelopeId: string, objectiveId: string, timeoutMs: number): object;
    /**
     * Record execution completion
     *
     * @param {object} tracking - Tracking token from recordStart
     * @param {string} status - 'success' | 'failed' | 'timeout'
     */
    recordComplete(tracking: object, status: string): void;
    /**
     * Get execution metrics for objective
     *
     * @param {string} objectiveId - Objective ID
     * @returns {object|null} Metrics summary
     */
    getObjectiveMetrics(objectiveId: string): object | null;
    /**
     * Get global execution metrics
     *
     * @returns {object} Global metrics
     */
    getGlobalMetrics(): object;
    /**
     * Get slow executions (>50% of timeout threshold)
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Slow executions
     */
    getSlowExecutions(limit?: number): Array<object>;
    /**
     * Get timeout executions
     *
     * @param {number} limit - Max results
     * @returns {Array<object>} Timeout executions
     */
    getTimeouts(limit?: number): Array<object>;
    /**
     * Reset metrics (for testing)
     */
    reset(): void;
    /**
     * Update objective-specific metrics
     *
     * @private
     */
    private _updateObjectiveMetrics;
    /**
     * Calculate percentiles from sorted array
     *
     * @private
     */
    private _calculatePercentiles;
    /**
     * Get percentile value from sorted array
     *
     * @private
     */
    private _percentile;
    /**
     * Check if execution is slow (>50% of timeout)
     *
     * @private
     */
    private _isSlowExecution;
    /**
     * Check if execution data is slow
     *
     * @private
     */
    private _isSlowExecutionData;
    /**
     * Record slow execution (logging)
     *
     * @private
     */
    private _recordSlowExecution;
}
//# sourceMappingURL=execution-metrics.d.ts.map