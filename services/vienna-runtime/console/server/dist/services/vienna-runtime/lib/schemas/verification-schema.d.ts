/**
 * VerificationTask Schema
 *
 * Input to verification engine.
 */
export type VerificationTask = {
    /**
     * - Unique verification identifier
     */
    verification_id: string;
    /**
     * - Reference to plan
     */
    plan_id: string;
    /**
     * - Reference to execution
     */
    execution_id: string;
    /**
     * - Human-readable objective
     */
    objective: string;
    /**
     * - Template identifier
     */
    verification_type: string;
    /**
     * - Verification scope (service, endpoint, environment)
     */
    scope: any;
    /**
     * - Checks to perform
     */
    postconditions: Array<PostconditionCheck>;
    /**
     * - Target strength level
     */
    verification_strength: string;
    /**
     * - Maximum verification time
     */
    timeout_ms: number;
    /**
     * - Stability validation window
     */
    stability_window_ms: number;
    /**
     * - Retry configuration
     */
    retry_policy: any;
    /**
     * - Unix timestamp
     */
    created_at: number;
    /**
     * - Creator identifier
     */
    created_by: string;
};
/**
 * PostconditionCheck Schema
 */
export type PostconditionCheck = {
    /**
     * - Unique check identifier
     */
    check_id: string;
    /**
     * - Check type (from CheckType)
     */
    type: string;
    /**
     * - Check target (service, URL, file path, etc.)
     */
    target: string;
    /**
     * - Whether check is required for success
     */
    required: boolean;
    /**
     * - Expected value (optional)
     */
    expected_value: any;
    /**
     * - Additional check configuration
     */
    config: any;
};
/**
 * VerificationResult Schema
 *
 * Output from verification engine.
 */
export type VerificationResult = {
    /**
     * - Verification identifier
     */
    verification_id: string;
    /**
     * - Reference to plan
     */
    plan_id: string;
    /**
     * - Reference to execution
     */
    execution_id: string;
    /**
     * - Verification status (success, failed, inconclusive, timed_out, skipped)
     */
    status: string;
    /**
     * - Whether objective was achieved
     */
    objective_achieved: boolean;
    /**
     * - Actual strength level achieved
     */
    verification_strength_achieved: string;
    /**
     * - Unix timestamp
     */
    started_at: number;
    /**
     * - Unix timestamp
     */
    completed_at: number;
    /**
     * - Verification duration
     */
    duration_ms: number;
    /**
     * - Individual check results
     */
    checks: Array<CheckResult>;
    /**
     * - Stability window result
     */
    stability: any;
    /**
     * - Human-readable summary
     */
    summary: string;
    /**
     * - Additional metadata
     */
    metadata: any;
};
/**
 * CheckResult Schema
 */
export type CheckResult = {
    /**
     * - Check identifier
     */
    check_id: string;
    /**
     * - passed, failed, skipped
     */
    status: string;
    /**
     * - Actual observed value
     */
    observed_value: any;
    /**
     * - Expected value
     */
    expected_value: any;
    /**
     * - Unix timestamp
     */
    checked_at: number;
    /**
     * - Evidence details
     */
    evidence: any;
};
/**
 * WorkflowOutcome Schema
 *
 * Final workflow conclusion.
 */
export type WorkflowOutcome = {
    /**
     * - Unique outcome identifier
     */
    outcome_id: string;
    /**
     * - Reference to plan
     */
    plan_id: string;
    /**
     * - Reference to execution (optional)
     */
    execution_id: string;
    /**
     * - Reference to verification (optional)
     */
    verification_id: string;
    /**
     * - Final workflow status
     */
    workflow_status: string;
    /**
     * - Whether objective was achieved
     */
    objective_achieved: boolean;
    /**
     * - T0, T1, or T2
     */
    risk_tier: string;
    /**
     * - Execution status (optional)
     */
    execution_status: string;
    /**
     * - Verification status (optional)
     */
    verification_status: string;
    /**
     * - Unix timestamp
     */
    finalized_at: number;
    /**
     * - Summary for operator
     */
    operator_visible_summary: string;
    /**
     * - Recommended next actions
     */
    next_actions: Array<string>;
    /**
     * - Additional metadata
     */
    metadata: any;
};
/**
 * Generate unique verification ID
 */
export function generateVerificationId(): string;
/**
 * Generate unique workflow outcome ID
 */
export function generateOutcomeId(): string;
export namespace VerificationStrength {
    let PROCEDURAL: string;
    let LOCAL_STATE: string;
    let SERVICE_HEALTH: string;
    let OBJECTIVE_STABILITY: string;
}
export namespace VerificationStatus {
    let SUCCESS: string;
    let FAILED: string;
    let INCONCLUSIVE: string;
    let TIMED_OUT: string;
    let SKIPPED: string;
}
export namespace WorkflowStatus {
    export let PLANNED: string;
    export let AWAITING_APPROVAL: string;
    export let APPROVED: string;
    export let DISPATCHED: string;
    export let EXECUTING: string;
    export let EXECUTION_FAILED: string;
    export let VERIFYING: string;
    export let COMPLETED: string;
    export let COMPLETED_WITH_WARNINGS: string;
    export let VERIFICATION_FAILED: string;
    let INCONCLUSIVE_1: string;
    export { INCONCLUSIVE_1 as INCONCLUSIVE };
    let TIMED_OUT_1: string;
    export { TIMED_OUT_1 as TIMED_OUT };
    export let CANCELLED: string;
    export let DENIED: string;
}
export namespace CheckType {
    let SYSTEMD_ACTIVE: string;
    let TCP_PORT_OPEN: string;
    let HTTP_HEALTHCHECK: string;
    let FILE_EXISTS: string;
    let FILE_CONTAINS: string;
    let STATE_GRAPH_VALUE: string;
    let CUSTOM: string;
}
/**
 * VerificationTask Schema
 *
 * Input to verification engine.
 *
 * @typedef {Object} VerificationTask
 * @property {string} verification_id - Unique verification identifier
 * @property {string} plan_id - Reference to plan
 * @property {string} execution_id - Reference to execution
 * @property {string} objective - Human-readable objective
 * @property {string} verification_type - Template identifier
 * @property {Object} scope - Verification scope (service, endpoint, environment)
 * @property {Array<PostconditionCheck>} postconditions - Checks to perform
 * @property {string} verification_strength - Target strength level
 * @property {number} timeout_ms - Maximum verification time
 * @property {number} stability_window_ms - Stability validation window
 * @property {Object} retry_policy - Retry configuration
 * @property {number} created_at - Unix timestamp
 * @property {string} created_by - Creator identifier
 */
/**
 * PostconditionCheck Schema
 *
 * @typedef {Object} PostconditionCheck
 * @property {string} check_id - Unique check identifier
 * @property {string} type - Check type (from CheckType)
 * @property {string} target - Check target (service, URL, file path, etc.)
 * @property {boolean} required - Whether check is required for success
 * @property {any} expected_value - Expected value (optional)
 * @property {Object} config - Additional check configuration
 */
/**
 * VerificationResult Schema
 *
 * Output from verification engine.
 *
 * @typedef {Object} VerificationResult
 * @property {string} verification_id - Verification identifier
 * @property {string} plan_id - Reference to plan
 * @property {string} execution_id - Reference to execution
 * @property {string} status - Verification status (success, failed, inconclusive, timed_out, skipped)
 * @property {boolean} objective_achieved - Whether objective was achieved
 * @property {string} verification_strength_achieved - Actual strength level achieved
 * @property {number} started_at - Unix timestamp
 * @property {number} completed_at - Unix timestamp
 * @property {number} duration_ms - Verification duration
 * @property {Array<CheckResult>} checks - Individual check results
 * @property {Object} stability - Stability window result
 * @property {string} summary - Human-readable summary
 * @property {Object} metadata - Additional metadata
 */
/**
 * CheckResult Schema
 *
 * @typedef {Object} CheckResult
 * @property {string} check_id - Check identifier
 * @property {string} status - passed, failed, skipped
 * @property {any} observed_value - Actual observed value
 * @property {any} expected_value - Expected value
 * @property {number} checked_at - Unix timestamp
 * @property {Object} evidence - Evidence details
 */
/**
 * WorkflowOutcome Schema
 *
 * Final workflow conclusion.
 *
 * @typedef {Object} WorkflowOutcome
 * @property {string} outcome_id - Unique outcome identifier
 * @property {string} plan_id - Reference to plan
 * @property {string} execution_id - Reference to execution (optional)
 * @property {string} verification_id - Reference to verification (optional)
 * @property {string} workflow_status - Final workflow status
 * @property {boolean} objective_achieved - Whether objective was achieved
 * @property {string} risk_tier - T0, T1, or T2
 * @property {string} execution_status - Execution status (optional)
 * @property {string} verification_status - Verification status (optional)
 * @property {number} finalized_at - Unix timestamp
 * @property {string} operator_visible_summary - Summary for operator
 * @property {Array<string>} next_actions - Recommended next actions
 * @property {Object} metadata - Additional metadata
 */
/**
 * Create VerificationTask
 */
export function createVerificationTask({ plan_id, execution_id, objective, verification_type, scope, postconditions, verification_strength, timeout_ms, stability_window_ms, retry_policy, created_by }: {
    plan_id: any;
    execution_id: any;
    objective: any;
    verification_type: any;
    scope: any;
    postconditions: any;
    verification_strength?: string;
    timeout_ms?: number;
    stability_window_ms?: number;
    retry_policy?: {
        max_attempts: number;
        backoff_ms: number;
    };
    created_by?: string;
}): {
    verification_id: string;
    plan_id: any;
    execution_id: any;
    objective: any;
    verification_type: any;
    scope: any;
    postconditions: any;
    verification_strength: string;
    timeout_ms: number;
    stability_window_ms: number;
    retry_policy: {
        max_attempts: number;
        backoff_ms: number;
    };
    created_at: number;
    created_by: string;
};
/**
 * Create VerificationResult
 */
export function createVerificationResult({ verification_id, plan_id, execution_id, status, objective_achieved, verification_strength_achieved, started_at, completed_at, checks, stability, summary, metadata }: {
    verification_id: any;
    plan_id: any;
    execution_id: any;
    status: any;
    objective_achieved: any;
    verification_strength_achieved: any;
    started_at: any;
    completed_at: any;
    checks: any;
    stability?: any;
    summary: any;
    metadata?: {};
}): {
    verification_id: any;
    plan_id: any;
    execution_id: any;
    status: any;
    objective_achieved: any;
    verification_strength_achieved: any;
    started_at: any;
    completed_at: any;
    duration_ms: number;
    checks: any;
    stability: any;
    summary: any;
    metadata: {};
};
/**
 * Create WorkflowOutcome
 */
export function createWorkflowOutcome({ plan_id, execution_id, verification_id, workflow_status, objective_achieved, risk_tier, execution_status, verification_status, operator_visible_summary, next_actions, metadata }: {
    plan_id: any;
    execution_id?: any;
    verification_id?: any;
    workflow_status: any;
    objective_achieved: any;
    risk_tier: any;
    execution_status?: any;
    verification_status?: any;
    operator_visible_summary: any;
    next_actions?: any[];
    metadata?: {};
}): {
    outcome_id: string;
    plan_id: any;
    execution_id: any;
    verification_id: any;
    workflow_status: any;
    objective_achieved: any;
    risk_tier: any;
    execution_status: any;
    verification_status: any;
    finalized_at: number;
    operator_visible_summary: any;
    next_actions: any[];
    metadata: {};
};
/**
 * Derive workflow status from execution and verification
 */
export function deriveWorkflowStatus(executionStatus: any, verificationStatus: any): string;
/**
 * Validate VerificationTask
 */
export function validateVerificationTask(task: any): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=verification-schema.d.ts.map