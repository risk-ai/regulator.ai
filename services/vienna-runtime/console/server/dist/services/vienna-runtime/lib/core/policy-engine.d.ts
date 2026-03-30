export = PolicyEngine;
declare class PolicyEngine {
    /**
     * @param {Object} params
     * @param {Object} params.stateGraph - State Graph instance for ledger queries
     * @param {Function} params.loadPolicies - Function to load active policies
     */
    constructor({ stateGraph, loadPolicies }: {
        stateGraph: any;
        loadPolicies: Function;
    });
    stateGraph: any;
    loadPolicies: Function;
    /**
     * Evaluate a plan against all applicable policies
     *
     * @param {Object} plan - Plan object to evaluate
     * @param {Object} context - Additional context
     * @param {Object} [context.actor] - Actor information
     * @param {Object} [context.runtime_context] - Runtime flags
     * @returns {Promise<PolicyDecision>}
     */
    evaluate(plan: any, context?: {
        actor?: any;
        runtime_context?: any;
    }): Promise<PolicyDecision>;
    /**
     * Evaluate policy conditions
     *
     * @private
     */
    private _evaluateConditions;
    /**
     * Evaluate ledger constraints
     *
     * Constraints are TRIGGER CONDITIONS for the policy.
     * - Return TRUE when constraint is VIOLATED (trigger met, policy should apply)
     * - Return FALSE when constraint is SATISFIED (no trigger, policy should not apply)
     *
     * @private
     */
    private _evaluateLedgerConstraints;
    /**
     * Parse lookback window string to milliseconds
     *
     * @private
     */
    private _parseLookbackWindow;
    /**
     * Resolve conflicts when multiple policies match
     * Uses deterministic conflict resolution:
     * 1. Deny beats allow
     * 2. Highest priority wins
     * 3. Requirements merge if compatible
     *
     * @private
     */
    private _resolveConflicts;
    /**
     * Get resolution strategy description
     *
     * @private
     */
    private _getResolutionStrategy;
    /**
     * Build final policy decision
     *
     * @private
     */
    private _buildDecision;
    /**
     * Build human-readable reasons
     *
     * @private
     */
    private _buildReasons;
    /**
     * Sanitize ledger results for storage (remove full objects, keep counts)
     *
     * @private
     */
    private _sanitizeLedgerResults;
    /**
     * Create a no-match decision (default allow)
     *
     * @private
     */
    private _createNoMatchDecision;
}
//# sourceMappingURL=policy-engine.d.ts.map