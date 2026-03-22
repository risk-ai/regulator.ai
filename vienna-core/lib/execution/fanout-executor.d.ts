/**
 * Fanout Executor
 *
 * Phase 3B: Failure isolation for fanout operations
 *
 * RESPONSIBILITIES:
 * - Expand fanout actions into per-item sub-envelopes
 * - Execute sub-envelopes with failure isolation
 * - Collect partial success results
 * - Create dead letters for failures
 * - Aggregate results for next action in chain
 *
 * DESIGN:
 * - Per-file failure containment (one file fails, others continue)
 * - Dead letter creation for failed items
 * - Partial success results (N succeeded, M failed)
 * - Continue-on-error policy (don't fail entire operation)
 */
export class FanoutExecutor {
    constructor(actionExecutor: any, deadLetterQueue: any);
    actionExecutor: any;
    deadLetterQueue: any;
    /**
     * Execute fanout action with failure isolation
     *
     * @param {object} envelope - Fanout envelope
     * @param {array} items - Items to fan out over (from previous action output)
     * @returns {Promise<object>} Fanout execution result
     */
    executeFanout(envelope: object, items: any[]): Promise<object>;
    /**
     * Create sub-envelope for single fanout item
     */
    createSubEnvelope(parentEnvelope: any, item: any, index: any): {
        envelope_id: string;
        objective_id: any;
        parent_envelope_id: any;
        action_type: any;
        target: any;
        params: any;
        input: any;
        fanout_index: any;
        fanout_total: any;
    };
    /**
     * Record fanout item failure as dead letter
     */
    recordFailure(envelope: any, item: any, index: any, error: any): Promise<void>;
    /**
     * Determine if failure is retryable
     */
    isRetryable(errorMessage: any): boolean;
}
//# sourceMappingURL=fanout-executor.d.ts.map