/**
 * Intent Trace Event
 */
export type IntentTraceEvent = {
    /**
     * - Type of lifecycle event
     */
    event_type: string;
    /**
     * - ISO timestamp
     */
    timestamp: string;
    /**
     * - Event-specific metadata
     */
    metadata: any;
};
/**
 * Intent Trace
 */
export type IntentTrace = {
    /**
     * - Unique intent identifier
     */
    intent_id: string;
    /**
     * - Intent type (restore_objective, etc.)
     */
    intent_type: string;
    /**
     * - Source type (operator, agent, system)
     */
    source: string;
    /**
     * - ISO timestamp
     */
    submitted_at: string;
    /**
     * - Current trace status
     */
    status: string;
    /**
     * - Lifecycle events
     */
    events: Array<IntentTraceEvent>;
    /**
     * - Related entity IDs
     */
    relationships: any;
};
/**
 * Intent Tracing
 *
 * Phase 11.5 — Intent Tracing and Execution Graph
 *
 * Purpose: Track full lifecycle of every intent through Vienna OS.
 * Provides execution graph reconstruction and operator visibility.
 *
 * Design invariant:
 * Every intent must produce a complete trace from submission to outcome.
 * Trace must connect: intent_id → reconciliation_id → execution_attempt_id
 */
/**
 * Intent Trace Event
 *
 * @typedef {Object} IntentTraceEvent
 * @property {string} event_type - Type of lifecycle event
 * @property {string} timestamp - ISO timestamp
 * @property {Object} metadata - Event-specific metadata
 */
/**
 * Intent Trace
 *
 * @typedef {Object} IntentTrace
 * @property {string} intent_id - Unique intent identifier
 * @property {string} intent_type - Intent type (restore_objective, etc.)
 * @property {string} source - Source type (operator, agent, system)
 * @property {string} submitted_at - ISO timestamp
 * @property {string} status - Current trace status
 * @property {Array<IntentTraceEvent>} events - Lifecycle events
 * @property {Object} relationships - Related entity IDs
 */
export class IntentTracer {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Record intent lifecycle event
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} event_type - Event type
     * @param {Object} metadata - Event metadata
     */
    recordEvent(intent_id: string, event_type: string, metadata?: any): Promise<{
        event_type: string;
        timestamp: string;
        metadata: any;
    }>;
    /**
     * Get intent trace by ID
     *
     * @param {string} intent_id - Intent identifier
     * @returns {IntentTrace|null} Complete intent trace
     */
    getTrace(intent_id: string): IntentTrace | null;
    /**
     * List intent traces with filters
     *
     * @param {Object} filters - Query filters
     * @returns {Array<IntentTrace>} Matching traces
     */
    listTraces(filters?: any): Array<IntentTrace>;
    /**
     * Build execution graph for intent
     *
     * @param {string} intent_id - Intent identifier
     * @returns {Object} Execution graph structure
     */
    buildExecutionGraph(intent_id: string): any;
    /**
     * Get intent timeline (chronological event list)
     *
     * @param {string} intent_id - Intent identifier
     * @returns {Array<Object>} Timeline events
     */
    getIntentTimeline(intent_id: string): Array<any>;
    /**
     * Link intent to reconciliation
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} reconciliation_id - Reconciliation identifier
     */
    linkReconciliation(intent_id: string, reconciliation_id: string): Promise<void>;
    /**
     * Link intent to execution
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} execution_id - Execution identifier
     */
    linkExecution(intent_id: string, execution_id: string): Promise<void>;
    /**
     * Link intent to verification
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} verification_id - Verification identifier
     */
    linkVerification(intent_id: string, verification_id: string): Promise<void>;
    /**
     * Link intent to outcome
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} outcome_id - Outcome identifier
     */
    linkOutcome(intent_id: string, outcome_id: string): Promise<void>;
    /**
     * Update intent status
     *
     * @param {string} intent_id - Intent identifier
     * @param {string} status - New status
     */
    updateStatus(intent_id: string, status: string): Promise<void>;
    _getReconciliationNode(reconciliation_id: any): Promise<{
        id: any;
        type: string;
        label: string;
        timestamp: string;
        status: string;
    }>;
    _getExecutionNode(execution_id: any): Promise<{
        id: any;
        type: string;
        label: any;
        timestamp: any;
        status: any;
        metadata: {
            risk_tier: any;
            target_id: any;
            duration_ms: any;
        };
    }>;
    _getVerificationNode(verification_id: any): Promise<{
        id: any;
        type: string;
        label: any;
        timestamp: any;
        status: any;
        metadata: {
            objective_achieved: any;
        };
    }>;
    _getOutcomeNode(outcome_id: any): Promise<{
        id: any;
        type: string;
        label: any;
        timestamp: any;
        status: any;
        metadata: {
            objective_achieved: any;
            summary: any;
        };
    }>;
}
//# sourceMappingURL=intent-tracing.d.ts.map