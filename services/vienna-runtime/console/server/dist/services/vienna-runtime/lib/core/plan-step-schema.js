/**
 * Plan Step Schema
 *
 * Defines the structure of individual steps within multi-step plans.
 *
 * Core invariant:
 * Each plan step is independently governable, observable, and ledgered,
 * while the plan as a whole remains the policy-approved execution unit.
 */
/**
 * Step execution status
 */
const StepStatus = {
    PENDING: 'pending',
    READY: 'ready',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    RETRYING: 'retrying',
    BLOCKED: 'blocked'
};
/**
 * Step failure handling strategies
 */
const FailureStrategy = {
    ABORT: 'abort', // Stop entire plan execution
    CONTINUE: 'continue', // Continue to next step
    RETRY: 'retry', // Retry this step
    FALLBACK: 'fallback', // Execute fallback step
    ESCALATE: 'escalate' // Trigger escalation workflow
};
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
function validatePlanStep(step) {
    const errors = [];
    // Required fields
    if (!step.step_id || typeof step.step_id !== 'string') {
        errors.push('step_id is required and must be a string');
    }
    if (typeof step.step_order !== 'number' || step.step_order < 1) {
        errors.push('step_order is required and must be >= 1');
    }
    if (!step.step_type || typeof step.step_type !== 'string') {
        errors.push('step_type is required and must be a string');
    }
    // Validate step_type
    const validStepTypes = ['action', 'query', 'conditional', 'escalation'];
    if (step.step_type && !validStepTypes.includes(step.step_type)) {
        errors.push(`step_type must be one of: ${validStepTypes.join(', ')}`);
    }
    // Action required for action/query steps
    if (['action', 'query'].includes(step.step_type)) {
        if (!step.action || typeof step.action !== 'object') {
            errors.push('action is required for action/query steps');
        }
        else {
            if (!step.action.action_id) {
                errors.push('action.action_id is required');
            }
        }
    }
    // Validate depends_on
    if (step.depends_on && !Array.isArray(step.depends_on)) {
        errors.push('depends_on must be an array');
    }
    // Validate condition structure
    if (step.condition !== null && step.condition !== undefined) {
        if (typeof step.condition !== 'object') {
            errors.push('condition must be an object or null');
        }
        else {
            if (!step.condition.type) {
                errors.push('condition.type is required when condition is present');
            }
            const validConditionTypes = ['always', 'if_failed', 'if_succeeded', 'custom'];
            if (step.condition.type && !validConditionTypes.includes(step.condition.type)) {
                errors.push(`condition.type must be one of: ${validConditionTypes.join(', ')}`);
            }
        }
    }
    // Validate retry_policy structure
    if (step.retry_policy !== null && step.retry_policy !== undefined) {
        if (typeof step.retry_policy !== 'object') {
            errors.push('retry_policy must be an object or null');
        }
        else {
            if (typeof step.retry_policy.max_attempts !== 'number' || step.retry_policy.max_attempts < 1) {
                errors.push('retry_policy.max_attempts must be a number >= 1');
            }
            if (typeof step.retry_policy.delay_ms !== 'number' || step.retry_policy.delay_ms < 0) {
                errors.push('retry_policy.delay_ms must be a number >= 0');
            }
            const validBackoff = ['fixed', 'linear', 'exponential'];
            if (step.retry_policy.backoff && !validBackoff.includes(step.retry_policy.backoff)) {
                errors.push(`retry_policy.backoff must be one of: ${validBackoff.join(', ')}`);
            }
        }
    }
    // Validate on_failure
    if (!step.on_failure || !Object.values(FailureStrategy).includes(step.on_failure)) {
        errors.push(`on_failure must be one of: ${Object.values(FailureStrategy).join(', ')}`);
    }
    // Validate fallback_step_id if strategy is fallback
    if (step.on_failure === FailureStrategy.FALLBACK && !step.fallback_step_id) {
        errors.push('fallback_step_id is required when on_failure is "fallback"');
    }
    // Validate timeout_ms
    if (typeof step.timeout_ms !== 'number' || step.timeout_ms <= 0) {
        errors.push('timeout_ms is required and must be > 0');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Create a plan step with defaults
 *
 * @param {Object} stepConfig - Step configuration
 * @returns {PlanStep}
 */
function createPlanStep(stepConfig) {
    const step = {
        step_id: stepConfig.step_id,
        step_order: stepConfig.step_order,
        step_type: stepConfig.step_type,
        action: stepConfig.action || null,
        depends_on: stepConfig.depends_on || [],
        condition: stepConfig.condition || { type: 'always' },
        retry_policy: stepConfig.retry_policy || null,
        verification_spec: stepConfig.verification_spec || null,
        on_failure: stepConfig.on_failure || FailureStrategy.ABORT,
        fallback_step_id: stepConfig.fallback_step_id || null,
        timeout_ms: stepConfig.timeout_ms || 30000, // 30 second default
        metadata: stepConfig.metadata || {}
    };
    return step;
}
/**
 * Build gateway recovery workflow steps
 * Canonical multi-step workflow for Phase 8.5
 *
 * @param {string} serviceId - Service to recover (e.g., 'openclaw-gateway')
 * @returns {PlanStep[]}
 */
function buildGatewayRecoverySteps(serviceId = 'openclaw-gateway') {
    return [
        // Step 1: Check current health
        createPlanStep({
            step_id: 'check_health',
            step_order: 1,
            step_type: 'query',
            action: {
                action_id: 'query_service_status',
                entities: { service: serviceId },
                params: {}
            },
            depends_on: [],
            condition: { type: 'always' },
            on_failure: FailureStrategy.ABORT,
            timeout_ms: 10000
        }),
        // Step 2: Restart service (conditional on unhealthy)
        createPlanStep({
            step_id: 'restart_service',
            step_order: 2,
            step_type: 'action',
            action: {
                action_id: 'restart_service',
                entities: { service: serviceId },
                params: {}
            },
            depends_on: ['check_health'],
            condition: {
                type: 'custom',
                step_ref: 'check_health',
                expression: { status_not: 'active' } // Only restart if not active
            },
            retry_policy: {
                max_attempts: 2,
                delay_ms: 5000,
                backoff: 'fixed'
            },
            verification_spec: {
                template_id: 'service_restart',
                params: { service_id: serviceId }
            },
            on_failure: FailureStrategy.ESCALATE,
            timeout_ms: 30000
        }),
        // Step 3: Verify health after restart
        createPlanStep({
            step_id: 'verify_health',
            step_order: 3,
            step_type: 'query',
            action: {
                action_id: 'query_service_status',
                entities: { service: serviceId },
                params: { wait_for_stability: true }
            },
            depends_on: ['restart_service'],
            condition: {
                type: 'if_succeeded',
                step_ref: 'restart_service'
            },
            on_failure: FailureStrategy.FALLBACK,
            fallback_step_id: 'escalate_incident',
            timeout_ms: 15000
        }),
        // Step 4: Escalate incident (fallback)
        createPlanStep({
            step_id: 'escalate_incident',
            step_order: 4,
            step_type: 'escalation',
            action: {
                action_id: 'create_incident',
                entities: { service: serviceId },
                params: {
                    severity: 'high',
                    category: 'service_recovery_failed'
                }
            },
            depends_on: ['verify_health'],
            condition: {
                type: 'if_failed',
                step_ref: 'verify_health'
            },
            on_failure: FailureStrategy.CONTINUE,
            timeout_ms: 10000
        })
    ];
}
module.exports = {
    StepStatus,
    FailureStrategy,
    validatePlanStep,
    createPlanStep,
    buildGatewayRecoverySteps
};
//# sourceMappingURL=plan-step-schema.js.map