/**
 * Plan Step Schema
 */
export type PlanStep = {
    /**
     * - Unique step identifier within plan
     */
    step_id: string;
    /**
     * - Execution order (1-indexed)
     */
    step_order: number;
    /**
     * - Type of step (action, query, conditional, escalation)
     */
    step_type: string;
    /**
     * - Action to execute
     */
    action: {
        action_id: string;
        entities: any;
        params: any;
    };
    /**
     * - Array of step_ids this step depends on
     */
    depends_on: string[];
    /**
     * - Conditional execution logic
     */
    condition: any | null;
    /**
     * - Condition type (always, if_failed, if_succeeded, custom)
     */
    type: string;
    /**
     * - Reference step for condition evaluation
     */
    step_ref: string;
    /**
     * - Custom condition expression
     */
    expression: any;
    /**
     * - Retry configuration
     */
    retry_policy: any | null;
    /**
     * - Maximum retry attempts
     */
    max_attempts: number;
    /**
     * - Delay between retries
     */
    delay_ms: number;
    /**
     * - Backoff strategy (fixed, linear, exponential)
     */
    backoff: string;
    /**
     * - Per-step verification
     */
    verification_spec: any | null;
    /**
     * - Verification template to use
     */
    template_id: string;
    /**
     * - Template parameters
     */
    params: any;
    /**
     * - Failure handling strategy
     */
    on_failure: string;
    /**
     * - Step to execute on failure (if strategy=fallback)
     */
    fallback_step_id: string | null;
    /**
     * - Step timeout in milliseconds
     */
    timeout_ms: number;
    /**
     * - Additional step metadata
     */
    metadata: any;
};
export namespace StepStatus {
    let PENDING: string;
    let READY: string;
    let RUNNING: string;
    let COMPLETED: string;
    let FAILED: string;
    let SKIPPED: string;
    let RETRYING: string;
    let BLOCKED: string;
}
export namespace FailureStrategy {
    let ABORT: string;
    let CONTINUE: string;
    let RETRY: string;
    let FALLBACK: string;
    let ESCALATE: string;
}
/**
 * Plan Step Schema
 *
 * @typedef {Object} PlanStep
 * @property {string} step_id - Unique step identifier within plan
 * @property {number} step_order - Execution order (1-indexed)
 * @property {string} step_type - Type of step (action, query, conditional, escalation)
 * @property {Object} action - Action to execute
 * @property {string} action.action_id - Canonical action ID
 * @property {Object} action.entities - Action entities (service, endpoint, etc.)
 * @property {Object} action.params - Action parameters
 * @property {string[]} depends_on - Array of step_ids this step depends on
 * @property {Object|null} condition - Conditional execution logic
 * @property {string} condition.type - Condition type (always, if_failed, if_succeeded, custom)
 * @property {string} condition.step_ref - Reference step for condition evaluation
 * @property {Object} condition.expression - Custom condition expression
 * @property {Object|null} retry_policy - Retry configuration
 * @property {number} retry_policy.max_attempts - Maximum retry attempts
 * @property {number} retry_policy.delay_ms - Delay between retries
 * @property {string} retry_policy.backoff - Backoff strategy (fixed, linear, exponential)
 * @property {Object|null} verification_spec - Per-step verification
 * @property {string} verification_spec.template_id - Verification template to use
 * @property {Object} verification_spec.params - Template parameters
 * @property {string} on_failure - Failure handling strategy
 * @property {string|null} fallback_step_id - Step to execute on failure (if strategy=fallback)
 * @property {number} timeout_ms - Step timeout in milliseconds
 * @property {Object} metadata - Additional step metadata
 */
/**
 * Validate plan step structure
 *
 * @param {PlanStep} step - Step to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validatePlanStep(step: PlanStep): any;
/**
 * Create a plan step with defaults
 *
 * @param {Object} stepConfig - Step configuration
 * @returns {PlanStep}
 */
export function createPlanStep(stepConfig: any): PlanStep;
/**
 * Build gateway recovery workflow steps
 * Canonical multi-step workflow for Phase 8.5
 *
 * @param {string} serviceId - Service to recover (e.g., 'openclaw-gateway')
 * @returns {PlanStep[]}
 */
export function buildGatewayRecoverySteps(serviceId?: string): PlanStep[];
//# sourceMappingURL=plan-step-schema.d.ts.map