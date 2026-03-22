export class ExecutorHealth {
    constructor(thresholds?: {});
    thresholds: {
        stalled_execution_seconds: any;
        queue_backlog_warning: any;
        queue_backlog_critical: any;
        failure_rate_warning: any;
        retry_rate_warning: any;
        avg_latency_warning_ms: any;
        avg_latency_critical_ms: any;
    };
    lastCheck: number;
    recentExecutions: any[];
    maxRecentExecutions: number;
    /**
     * Check executor health
     *
     * @param {object} executor - QueuedExecutor instance
     * @returns {object} Health report
     */
    check(executor: object): object;
    /**
     * Record execution completion (for latency tracking)
     *
     * @param {number} durationMs - Execution duration in milliseconds
     */
    recordExecution(durationMs: number): void;
    /**
     * Check queue backlog
     */
    _checkQueueBacklog(queueStats: any): {
        status: string;
        message: string;
        value: any;
        threshold: any;
    } | {
        status: string;
        message: string;
        value: any;
        threshold?: undefined;
    };
    /**
     * Check for stalled execution
     */
    _checkStalledExecution(executor: any): {
        status: string;
        message: string;
        envelope_id?: undefined;
        execution_time_seconds?: undefined;
        threshold_seconds?: undefined;
    } | {
        status: string;
        message: string;
        envelope_id: any;
        execution_time_seconds: number;
        threshold_seconds: any;
    };
    /**
     * Check failure rate
     */
    _checkFailureRate(queueStats: any, dlqStats: any): {
        status: string;
        message: string;
        rate: number;
        threshold?: undefined;
    } | {
        status: string;
        message: string;
        rate: number;
        threshold: any;
    };
    /**
     * Check retry rate
     */
    _checkRetryRate(queueStats: any): {
        status: string;
        message: string;
        rate: number;
        threshold?: undefined;
    } | {
        status: string;
        message: string;
        rate: number;
        threshold: any;
    };
    /**
     * Check average latency
     */
    _checkAvgLatency(): {
        status: string;
        message: string;
        value_ms?: undefined;
        threshold_ms?: undefined;
    } | {
        status: string;
        message: string;
        value_ms: number;
        threshold_ms: any;
    } | {
        status: string;
        message: string;
        value_ms: number;
        threshold_ms?: undefined;
    };
    /**
     * Check DLQ growth
     */
    _checkDLQGrowth(dlqStats: any): {
        status: string;
        message: string;
        count: any;
    };
    /**
     * Calculate average latency from recent executions
     */
    _calculateAvgLatency(): number;
    /**
     * Determine overall health state from checks
     */
    _determineOverallState(checks: any): string;
}
export namespace HealthState {
    let HEALTHY: string;
    let WARNING: string;
    let CRITICAL: string;
    let STALLED: string;
    let PAUSED: string;
}
//# sourceMappingURL=executor-health.d.ts.map