/**
 * Plan Executor
 *
 * Decomposes plan into individual intents and sends through governance.
 * NOW IMPLEMENTS: Per-step governance execution with dependency ordering.
 */
export class PlanExecutor {
    constructor(stateGraph: any, governancePipeline?: any);
    stateGraph: any;
    governancePipeline: any;
    /**
     * Decompose plan into intents
     *
     * @param {object} plan - Plan object
     * @returns {Array} - Array of intent objects
     */
    decompose(plan: object): any[];
    /**
     * Execute plan with governance
     *
     * Implements:
     * - Dependency ordering
     * - Per-step governance evaluation
     * - Failure handling
     * - Progress tracking
     *
     * @param {object} plan - Plan object
     * @param {object} context - Execution context
     * @returns {Promise<object>} - Execution result
     */
    execute(plan: object, context?: object): Promise<object>;
    /**
     * Execute single step through governance
     *
     * PHASE 16.1 HARDENED: No stubs, no bypasses, no silent failures.
     *
     * Every step flows through real governance pipeline:
     * intent → reconciliation → policy → warrant → execution → verification → ledger
     *
     * @param {object} intent - Intent object
     * @param {object} plan - Parent plan
     * @param {object} context - Execution context
     * @returns {Promise<object>} - Step result
     */
    executeStep(intent: object, plan: object, context: object): Promise<object>;
    _recordIntentTrace(intent: any, plan: any, execution_id: any): Promise<void>;
    _requestReconciliation(intent: any, execution_id: any): Promise<import("./reconciliation-gate").GateDecision>;
    _evaluatePolicy(intent: any, plan: any, context: any, execution_id: any): Promise<PolicyDecision>;
    _issueWarrant(intent: any, policyDecision: any, execution_id: any): Promise<any>;
    _executeAction(intent: any, warrant: any, execution_id: any): Promise<any>;
    _verifyExecution(intent: any, executionResult: any, verificationSpec: any, execution_id: any): Promise<any>;
    _recordSuccessLedger(intent: any, execution_id: any, executionResult: any, verificationResult: any, warrant: any): Promise<void>;
    _recordFailureLedger(intent: any, execution_id: any, error: any): Promise<void>;
    /**
     * Record generic ledger event
     *
     * @private
     * @param {string} execution_id - Execution ID
     * @param {string} event_type - Event type
     * @param {Object} payload - Event payload
     */
    private _recordLedgerEvent;
    _buildDeniedResult(intent: any, execution_id: any, reason_type: any, reason_message: any, metadata?: {}): {
        status: string;
        intent_id: any;
        execution_id: any;
        denial_reason: any;
        message: any;
        metadata: {};
    };
    _buildFailedResult(intent: any, execution_id: any, error: any, metadata?: {}): {
        status: string;
        intent_id: any;
        execution_id: any;
        error: any;
        metadata: {};
    };
    /**
     * Order steps by dependencies (topological sort)
     *
     * @param {Array} steps - Plan steps
     * @returns {Array<string>} - Ordered step IDs
     */
    orderByDependencies(steps: any[]): Array<string>;
    /**
     * Validate plan dependencies
     *
     * @param {object} plan - Plan object
     * @returns {object} - {valid: boolean, errors: Array}
     */
    validateDependencies(plan: object): object;
    /**
     * Determine approval requirement from policy decision
     *
     * @private
     * @param {Object} policyDecision - Policy decision
     * @param {Object} intent - Intent object
     * @param {Object} step - Plan step
     * @param {string} execution_id - Execution ID
     * @returns {Promise<Object>} Approval requirement
     */
    private _determineApprovalRequirement;
    /**
     * Create approval request
     *
     * @private
     * @param {Object} intent - Intent object
     * @param {Object} plan - Parent plan
     * @param {string} execution_id - Execution ID
     * @param {Object} approvalRequirement - Approval requirement
     * @param {Object} policyDecision - Policy decision
     * @returns {Promise<Object>} Approval request
     */
    private _createApprovalRequest;
    /**
     * Generate human-readable action summary
     *
     * @private
     * @param {Object} intent - Intent object
     * @param {Object} step - Plan step
     * @returns {string} Action summary
     */
    private _generateActionSummary;
}
//# sourceMappingURL=plan-model.d.ts.map