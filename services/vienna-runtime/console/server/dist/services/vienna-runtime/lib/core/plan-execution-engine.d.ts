/**
 * Plan Execution Engine
 */
export class PlanExecutionEngine {
    constructor(options?: {});
    stateGraph: any;
    executor: any;
    verificationEngine: any;
    approvalManager: any;
    lockManager: ExecutionLockManager;
    /**
     * Execute a multi-step plan
     *
     * @param {Object} plan - Plan object with steps array
     * @param {Object} context - Execution context (user, session, etc.)
     * @returns {Promise<Object>} Execution result
     */
    executePlan(plan: any, context?: any): Promise<any>;
    /**
     * Execute a single step
     */
    _executeStep(step: any, execContext: any, context: any): Promise<void>;
    /**
     * Execute step with retry logic
     */
    _executeStepWithRetry(step: any, execContext: any, context: any): Promise<void>;
    /**
     * Execute step action
     */
    _executeStepAction(step: any, context: any): Promise<any>;
    /**
     * Call action executor (interface to chat-action-bridge or similar)
     */
    _callActionExecutor(action: any, context: any): Promise<any>;
    /**
     * Verify step execution
     */
    _verifyStep(step: any, executionResult: any, context: any): Promise<any>;
    /**
     * Handle step failure
     */
    _handleStepFailure(step: any, execContext: any, context: any, error: any): Promise<void>;
    /**
     * Calculate retry delay
     */
    _calculateRetryDelay(retryPolicy: any, attempt: any): any;
    /**
     * Determine overall plan outcome
     */
    _determinePlanOutcome(execContext: any): "blocked" | "failed" | "success" | "partial";
    /**
     * Emit ledger event
     */
    _emitLedgerEvent(event: any): Promise<void>;
    /**
     * Acquire locks for step (atomic set acquisition)
     *
     * Core guarantee: ALL locks must succeed, or none are held.
     *
     * @param {Object} step
     * @param {Array} targets - [{ target_type, target_id }]
     * @param {Object} execContext
     * @param {Object} context
     * @returns {Promise<Object>} { success, lock_ids?, reason?, conflicting_targets?, locked_by? }
     */
    _acquireStepLocks(step: any, targets: any[], execContext: any, context: any): Promise<any>;
    /**
     * Release locks for step
     *
     * @param {Object} step
     * @param {Object} execContext
     * @param {Object} context
     */
    _releaseStepLocks(step: any, execContext: any, context: any): Promise<void>;
    /**
     * Check approval resolution and determine if execution can proceed
     *
     * Core invariant:
     * No warrant/execution occurs when approval is required but not granted.
     *
     * @param {Object} step - Plan step
     * @param {Object} execContext - Execution context
     * @param {Object} context - Runtime context
     * @returns {Promise<Object>} { can_proceed, outcome, reason, metadata, approval_id? }
     */
    _checkApprovalResolution(step: any, execContext: any, context: any): Promise<any>;
    /**
     * Sleep utility
     */
    _sleep(ms: any): Promise<any>;
}
/**
 * Plan execution context
 * Tracks state of multi-step plan execution
 */
export class PlanExecutionContext {
    constructor(planId: any);
    planId: any;
    stepStates: Map<any, any>;
    executionLog: any[];
    startedAt: string;
    completedAt: any;
    acquiredLocks: any[];
    /**
     * Initialize step state
     */
    initializeStep(stepId: any): void;
    /**
     * Update step state
     */
    updateStepState(stepId: any, updates: any): void;
    /**
     * Get step state
     */
    getStepState(stepId: any): any;
    /**
     * Log execution event
     */
    logEvent(event: any): void;
    /**
     * Check if all dependencies are satisfied
     */
    areDependenciesSatisfied(step: any): boolean;
    /**
     * Check if step condition is met
     */
    isConditionMet(step: any): boolean;
    /**
     * Evaluate custom condition expression
     */
    _evaluateCustomCondition(refState: any, expression: any): boolean;
    /**
     * Get plan execution summary
     */
    getSummary(): {
        plan_id: any;
        started_at: string;
        completed_at: any;
        total_steps: number;
        status_counts: {};
        steps: {
            step_id: any;
            status: any;
            attempts: any;
        }[];
        execution_log: any[];
    };
}
import { ExecutionLockManager } from "../execution/execution-lock-manager";
//# sourceMappingURL=plan-execution-engine.d.ts.map