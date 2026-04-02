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
class OperationalMetrics {
    /**
     * Collect operational metrics from executor
     *
     * @param {object} executor - QueuedExecutor instance
     * @returns {object} Comprehensive metrics snapshot
     */
    static collect(executor) {
        const timestamp = new Date().toISOString();
        // Collect state from all subsystems
        const queueStats = executor.getQueueState();
        const controlState = executor.getExecutionControlState();
        const rateLimiterState = executor.getRateLimiterState();
        const agentBudgetState = executor.getAgentBudgetState();
        const dlqStats = executor.getDeadLetterStats();
        const recursionState = executor.getRecursionState();
        const health = executor.getHealth();
        const integrity = executor.checkIntegrity();
        // Compute derived metrics
        const metrics = {
            timestamp,
            // Core counters
            envelopes_processed_total: queueStats.completed,
            envelopes_failed_total: queueStats.failed,
            envelopes_dead_lettered_total: dlqStats.total,
            envelopes_retried_total: queueStats.failed, // Approximation
            // Current state
            queue_depth_current: queueStats.queued,
            active_envelopes_current: queueStats.executing,
            dead_letter_active: dlqStats.by_state?.dead_lettered || 0,
            // Pause state
            paused_state: controlState.paused,
            paused_reason: controlState.reason,
            paused_at: controlState.paused_at,
            // Health state
            health_state: health.state,
            health_checks: Object.entries(health.checks).reduce((acc, [key, check]) => {
                acc[key] = check.status;
                return acc;
            }, {}),
            // Integrity state
            integrity_state: integrity.state,
            integrity_checks: Object.entries(integrity.checks).reduce((acc, [key, check]) => {
                acc[key] = check.status;
                return acc;
            }, {}),
            // Rate limiting
            rate_limit_global: {
                current: rateLimiterState.global.count,
                limit: rateLimiterState.global.limit,
                remaining: rateLimiterState.global.remaining
            },
            // Agent activity
            agents: this._collectAgentMetrics(agentBudgetState, rateLimiterState),
            // Recursion control
            recursion_blocks_total: recursionState.active_cooldowns?.length || 0,
            // Latency (if available)
            average_execution_latency_ms: health.metrics?.avg_latency_ms || null,
            // Rates
            failure_rate: this._computeFailureRate(queueStats, dlqStats),
            retry_rate: this._computeRetryRate(queueStats)
        };
        return metrics;
    }
    /**
     * Collect agent-specific metrics
     */
    static _collectAgentMetrics(budgetState, rateLimiterState) {
        const agents = {};
        // Collect from budget state
        for (const [agentId, budget] of Object.entries(budgetState.agents || {})) {
            agents[agentId] = {
                queued: budget.queued.count,
                active: budget.active.count,
                rate_limit_used: 0
            };
        }
        // Augment with rate limiter data
        for (const [agentId, rateData] of Object.entries(rateLimiterState.agents || {})) {
            if (!agents[agentId]) {
                agents[agentId] = { queued: 0, active: 0 };
            }
            agents[agentId].rate_limit_used = rateData.count;
        }
        return agents;
    }
    /**
     * Compute failure rate
     */
    static _computeFailureRate(queueStats, dlqStats) {
        const total = queueStats.total + dlqStats.total;
        if (total === 0)
            return 0;
        const failures = queueStats.failed + dlqStats.total;
        return failures / total;
    }
    /**
     * Compute retry rate
     */
    static _computeRetryRate(queueStats) {
        const total = queueStats.total;
        if (total === 0)
            return 0;
        const retries = queueStats.failed;
        return retries / total;
    }
    /**
     * Format metrics for display
     *
     * @param {object} metrics - Raw metrics
     * @returns {string} Formatted metrics summary
     */
    static formatSummary(metrics) {
        const lines = [
            `=== Vienna Operational Metrics ===`,
            `Timestamp: ${metrics.timestamp}`,
            ``,
            `Queue Status:`,
            `  Queued: ${metrics.queue_depth_current}`,
            `  Executing: ${metrics.active_envelopes_current}`,
            `  Completed: ${metrics.envelopes_processed_total}`,
            `  Failed: ${metrics.envelopes_failed_total}`,
            `  Dead Lettered: ${metrics.envelopes_dead_lettered_total}`,
            ``,
            `System State:`,
            `  Paused: ${metrics.paused_state ? 'YES' : 'NO'}`,
            metrics.paused_state ? `  Reason: ${metrics.paused_reason}` : null,
            `  Health: ${metrics.health_state}`,
            `  Integrity: ${metrics.integrity_state}`,
            ``,
            `Rates:`,
            `  Failure Rate: ${(metrics.failure_rate * 100).toFixed(1)}%`,
            `  Retry Rate: ${(metrics.retry_rate * 100).toFixed(1)}%`,
            ``,
            `Rate Limiting:`,
            `  Global: ${metrics.rate_limit_global.current}/${metrics.rate_limit_global.limit}`,
            ``,
            `Active Agents: ${Object.keys(metrics.agents).length}`
        ];
        return lines.filter(l => l !== null).join('\n');
    }
}
module.exports = OperationalMetrics;
//# sourceMappingURL=operational-metrics.js.map