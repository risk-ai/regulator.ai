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
export class OperationalSafetyWriter {
    stateGraph: any;
    stateGraphWritesEnabled: boolean;
    /**
     * Set State Graph instance (dependency injection)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     * @param {boolean} enabled - Whether to enable writes
     */
    setStateGraph(stateGraph: StateGraph, enabled?: boolean): void;
    /**
     * Write execution pause state
     *
     * @param {Object} pauseState - Pause state from ExecutionControl
     * @returns {Promise<void>}
     */
    writePauseState(pauseState: any): Promise<void>;
    /**
     * Write dead letter queue stats
     *
     * @param {Object} dlqStats - DLQ stats
     * @returns {Promise<void>}
     */
    writeDLQStats(dlqStats: any): Promise<void>;
    /**
     * Write executor health state
     *
     * @param {Object} healthState - Executor health state
     * @returns {Promise<void>}
     */
    writeHealthState(healthState: any): Promise<void>;
    /**
     * Write integrity check result
     *
     * @param {Object} integrityResult - Integrity check result
     * @returns {Promise<void>}
     */
    writeIntegrityCheck(integrityResult: any): Promise<void>;
    /**
     * Write rate limit state
     *
     * @param {string} scope - Rate limit scope
     * @param {Object} limitState - Rate limit state
     * @returns {Promise<void>}
     */
    writeRateLimitState(scope: string, limitState: any): Promise<void>;
    /**
     * Write agent budget state
     *
     * @param {string} agentId - Agent ID
     * @param {Object} budgetState - Budget state
     * @returns {Promise<void>}
     */
    writeAgentBudgetState(agentId: string, budgetState: any): Promise<void>;
    /**
     * Reconcile operational safety state on startup
     *
     * @param {Object} executionControl - ExecutionControl instance
     * @param {Object} deadLetterQueue - DeadLetterQueue instance
     * @param {Object} executorHealth - ExecutorHealth instance
     * @param {Object} integrityChecker - IntegrityChecker instance
     * @returns {Promise<void>}
     */
    reconcileOperationalSafety(executionControl: any, deadLetterQueue: any, executorHealth: any, integrityChecker: any): Promise<void>;
}
//# sourceMappingURL=operational-safety-writer.d.ts.map