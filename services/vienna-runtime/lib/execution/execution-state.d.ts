/**
 * Execution State API
 *
 * Read-only inspection of execution state for debugging and monitoring.
 * Provides real-time view without direct database queries.
 */
export class ExecutionState {
    constructor(options?: {});
    queue: any;
    recursionGuard: any;
    replayLog: any;
    /**
     * Get current queue state
     *
     * @returns {object} Queue statistics
     */
    getQueueState(): object;
    /**
     * Get active (executing) envelopes
     *
     * @returns {array} Currently executing envelopes
     */
    getActiveEnvelopes(): any[];
    /**
     * Get all envelopes for objective
     *
     * @param {string} objectiveId - Objective identifier
     * @returns {array} All envelopes for objective
     */
    getObjectiveState(objectiveId: string): any[];
    /**
     * Get causal chain for envelope
     *
     * @param {string} envelopeId - Envelope to trace
     * @returns {Promise<array>} Ancestry tree
     */
    getCausalChain(envelopeId: string): Promise<any[]>;
    /**
     * Get blocked envelopes
     *
     * @returns {array} Envelopes blocked by recursion guard
     */
    getBlockedEnvelopes(): any[];
    /**
     * Get execution metrics
     *
     * @param {object} options - Metric options
     * @returns {Promise<object>} Execution metrics
     */
    getExecutionMetrics(options?: object): Promise<object>;
    /**
     * Get recursion guard metrics
     */
    _getRecursionMetrics(): {
        error: string;
        active_triggers?: undefined;
        exhausted_triggers?: undefined;
        active_cooldowns?: undefined;
        cached_idempotency_keys?: undefined;
        trigger_budgets?: undefined;
    } | {
        active_triggers: number;
        exhausted_triggers: number;
        active_cooldowns: any;
        cached_idempotency_keys: any;
        trigger_budgets: any;
        error?: undefined;
    };
    /**
     * Compute duration in seconds
     */
    _computeDuration(startedAt: any): number;
    /**
     * Get full system state snapshot
     *
     * @returns {Promise<object>} Complete state
     */
    getSnapshot(): Promise<object>;
}
//# sourceMappingURL=execution-state.d.ts.map