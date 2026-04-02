/**
 * Operational Safety Writer
 *
 * Persists Phase 6 operational safety state to State Graph.
 * Phase 7.4: Operational Safety Integration Pass
 *
 * Design:
 * - Write operational state to runtime_context
 * - Fire-and-forget writes (non-blocking)
 * - DB failure does not affect operational logic
 * - Idempotent writes (safe to replay)
 */
class OperationalSafetyWriter {
    constructor() {
        this.stateGraph = null;
        this.stateGraphWritesEnabled = false;
    }
    /**
     * Set State Graph instance (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} enabled - Whether to enable writes
     */
    setStateGraph(stateGraph, enabled = true) {
        this.stateGraph = stateGraph;
        this.stateGraphWritesEnabled = enabled;
    }
    /**
     * Write execution pause state
     *
     * @param {Object} pauseState - Pause state from ExecutionControl
     * @returns {Promise<void>}
     */
    async writePauseState(pauseState) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext('execution_paused', pauseState.paused ? 'true' : 'false', {
                context_type: 'status',
                metadata: {
                    paused_at: pauseState.paused_at,
                    resumed_at: pauseState.resumed_at,
                    reason: pauseState.reason,
                    paused_by: pauseState.paused_by
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write pause state:', error.message);
            // Continue operation (DB failure does not block pause logic)
        }
    }
    /**
     * Write dead letter queue stats
     *
     * @param {Object} dlqStats - DLQ stats
     * @returns {Promise<void>}
     */
    async writeDLQStats(dlqStats) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext('dlq_stats', JSON.stringify(dlqStats), {
                context_type: 'status',
                metadata: {
                    total: dlqStats.total || 0,
                    by_state: dlqStats.by_state || {},
                    by_reason: dlqStats.by_reason || {},
                    last_updated: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write DLQ stats:', error.message);
            // Continue operation
        }
    }
    /**
     * Write executor health state
     *
     * @param {Object} healthState - Executor health state
     * @returns {Promise<void>}
     */
    async writeHealthState(healthState) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext('executor_health', healthState.state || 'HEALTHY', {
                context_type: 'status',
                metadata: {
                    executor_ready: healthState.executor_ready,
                    queue_healthy: healthState.queue_healthy,
                    checks: healthState.checks || {},
                    metrics: healthState.metrics || {},
                    timestamp: healthState.timestamp || new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write health state:', error.message);
            // Continue operation
        }
    }
    /**
     * Write integrity check result
     *
     * @param {Object} integrityResult - Integrity check result
     * @returns {Promise<void>}
     */
    async writeIntegrityCheck(integrityResult) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext('integrity_check', integrityResult.passed ? 'passed' : 'failed', {
                context_type: 'status',
                metadata: {
                    passed: integrityResult.passed,
                    issues: integrityResult.issues || [],
                    checked_at: new Date().toISOString(),
                    checks_performed: integrityResult.checks_performed || []
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write integrity check:', error.message);
            // Continue operation
        }
    }
    /**
     * Write rate limit state
     *
     * @param {string} scope - Rate limit scope
     * @param {Object} limitState - Rate limit state
     * @returns {Promise<void>}
     */
    async writeRateLimitState(scope, limitState) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext(`rate_limit_${scope}`, JSON.stringify(limitState), {
                context_type: 'status',
                metadata: {
                    scope,
                    limited: limitState.limited || false,
                    requests: limitState.requests || 0,
                    limit: limitState.limit || 0,
                    window_ms: limitState.window_ms || 0,
                    reset_at: limitState.reset_at,
                    last_updated: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write rate limit state:', error.message);
            // Continue operation
        }
    }
    /**
     * Write agent budget state
     *
     * @param {string} agentId - Agent ID
     * @param {Object} budgetState - Budget state
     * @returns {Promise<void>}
     */
    async writeAgentBudgetState(agentId, budgetState) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            await this.stateGraph.setRuntimeContext(`agent_budget_${agentId}`, JSON.stringify(budgetState), {
                context_type: 'status',
                metadata: {
                    agent_id: agentId,
                    exceeded: budgetState.exceeded || false,
                    used: budgetState.used || 0,
                    limit: budgetState.limit || 0,
                    reset_at: budgetState.reset_at,
                    last_updated: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Failed to write agent budget state:', error.message);
            // Continue operation
        }
    }
    /**
     * Reconcile operational safety state on startup
     *
     * @param {Object} executionControl - ExecutionControl instance
     * @param {Object} deadLetterQueue - DeadLetterQueue instance
     * @param {Object} executorHealth - ExecutorHealth instance
     * @param {Object} integrityChecker - IntegrityChecker instance
     * @returns {Promise<void>}
     */
    async reconcileOperationalSafety(executionControl, deadLetterQueue, executorHealth, integrityChecker) {
        if (!this.stateGraph || !this.stateGraphWritesEnabled) {
            return;
        }
        try {
            console.log('[OperationalSafetyWriter] Reconciling operational safety state...');
            // Reconcile pause state
            if (executionControl) {
                const pauseState = executionControl.getExecutionState();
                await this.writePauseState(pauseState);
            }
            // Reconcile DLQ stats
            if (deadLetterQueue) {
                const dlqStats = deadLetterQueue.getStats();
                await this.writeDLQStats(dlqStats);
            }
            // Reconcile health state
            if (executorHealth) {
                const healthState = executorHealth.getHealthState();
                await this.writeHealthState(healthState);
            }
            // No integrity check on startup (run on-demand)
            console.log('[OperationalSafetyWriter] Operational safety state reconciled');
        }
        catch (error) {
            console.error('[OperationalSafetyWriter] Reconciliation failed:', error.message);
            // Continue operation (DB failure does not block startup)
        }
    }
}
module.exports = { OperationalSafetyWriter };
//# sourceMappingURL=operational-safety-writer.js.map