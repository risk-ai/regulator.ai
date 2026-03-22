/**
 * Execution Graph
 *
 * Phase 11.5 — Intent Tracing and Execution Graph
 *
 * Purpose: Reconstruct complete execution chains from ledger events.
 * Provides operator visibility into governance decisions and execution flow.
 *
 * Design invariant:
 * Every execution must be traceable from intent to outcome.
 * Graph must be reconstructable from immutable ledger events.
 */
/**
 * Execution Graph Builder
 *
 * Reconstructs execution flow from State Graph data.
 * Answers operator questions:
 * - Why did this action run?
 * - Why was it denied?
 * - What governance rule applied?
 * - Which execution attempt handled it?
 */
export class ExecutionGraphBuilder {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Build complete execution graph for intent
     *
     * @param {string} intent_id - Intent identifier
     * @returns {Object} Complete execution graph
     */
    buildIntentGraph(intent_id: string): any;
    /**
     * Build execution graph for execution ID
     *
     * @param {string} execution_id - Execution identifier
     * @returns {Object} Execution-focused graph
     */
    buildExecutionGraph(execution_id: string): any;
    /**
     * Get intent timeline (chronological events)
     *
     * @param {string} intent_id - Intent identifier
     * @returns {Array<Object>} Timeline events
     */
    getIntentTimeline(intent_id: string): Array<any>;
    /**
     * Explain why action was taken or denied
     *
     * @param {string} intent_id - Intent identifier
     * @returns {Object} Explanation with reasoning
     */
    explainDecision(intent_id: string): any;
    _buildTimeline(events: any): any;
    _buildEventTimeline(events: any): any;
    _getPolicyDecision(intent_id: any): Promise<any>;
    _getReconciliationData(reconciliation_id: any): Promise<{
        reconciliation_id: any;
        status: string;
        created_at: string;
    }>;
    _getExecutionData(execution_id: any): Promise<any>;
    _getVerificationData(verification_id: any): Promise<any>;
    _getOutcomeData(outcome_id: any): Promise<any>;
}
//# sourceMappingURL=execution-graph.d.ts.map