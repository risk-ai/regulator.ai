/**
 * Plan Object Schema
 */
export type Plan = {
    /**
     * - Unique plan identifier
     */
    plan_id: string;
    /**
     * - Human-readable objective
     */
    objective: string;
    /**
     * - Reference to originating intent (optional)
     */
    intent_id: string;
    /**
     * - Ordered execution steps
     */
    steps: Array<PlanStep>;
    /**
     * - Conditions that must be true before execution
     */
    preconditions: Array<string>;
    /**
     * - Expected conditions after successful execution
     */
    postconditions: Array<string>;
    /**
     * - T0, T1, or T2
     */
    risk_tier: string;
    /**
     * - Expected execution time
     */
    estimated_duration_ms: number;
    /**
     * - pending, approved, executing, completed, failed, cancelled
     */
    status: string;
    /**
     * - Verification specification (Phase 8.2)
     */
    verification_spec: any;
    /**
     * - Additional context
     */
    metadata: any;
    /**
     * - Unix timestamp
     */
    created_at: number;
    /**
     * - Unix timestamp
     */
    updated_at: number;
};
/**
 * Plan Step Schema
 */
export type PlanStep = {
    /**
     * - Sequential step number (1-indexed)
     */
    step_number: number;
    /**
     * - Canonical action or instruction type
     */
    action: string;
    /**
     * - Human-readable step description
     */
    description: string;
    /**
     * - Action arguments
     */
    args: any;
    /**
     * - local or openclaw
     */
    executor: string;
    /**
     * - Step timeout
     */
    timeout_ms: number;
    /**
     * - Whether step failure should abort plan
     */
    required: boolean;
    /**
     * - Post-step verification checks
     */
    verification: Array<string>;
};
/**
 * Generate unique plan ID
 */
export function generatePlanId(): string;
/**
 * Plan Object Schema
 *
 * @typedef {Object} Plan
 * @property {string} plan_id - Unique plan identifier
 * @property {string} objective - Human-readable objective
 * @property {string} intent_id - Reference to originating intent (optional)
 * @property {Array<PlanStep>} steps - Ordered execution steps
 * @property {Array<string>} preconditions - Conditions that must be true before execution
 * @property {Array<string>} postconditions - Expected conditions after successful execution
 * @property {string} risk_tier - T0, T1, or T2
 * @property {number} estimated_duration_ms - Expected execution time
 * @property {string} status - pending, approved, executing, completed, failed, cancelled
 * @property {Object} verification_spec - Verification specification (Phase 8.2)
 * @property {Object} metadata - Additional context
 * @property {number} created_at - Unix timestamp
 * @property {number} updated_at - Unix timestamp
 */
/**
 * Plan Step Schema
 *
 * @typedef {Object} PlanStep
 * @property {number} step_number - Sequential step number (1-indexed)
 * @property {string} action - Canonical action or instruction type
 * @property {string} description - Human-readable step description
 * @property {Object} args - Action arguments
 * @property {string} executor - local or openclaw
 * @property {number} timeout_ms - Step timeout
 * @property {boolean} required - Whether step failure should abort plan
 * @property {Array<string>} verification - Post-step verification checks
 */
/**
 * Validate Plan object structure
 */
export function validatePlan(plan: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Create a new Plan object
 */
export function createPlan({ objective, intent_id, steps, preconditions, postconditions, risk_tier, estimated_duration_ms, verification_spec, metadata }: {
    objective: any;
    intent_id?: any;
    steps: any;
    preconditions?: any[];
    postconditions?: any[];
    risk_tier: any;
    estimated_duration_ms?: number;
    verification_spec?: any;
    metadata?: {};
}): {
    plan_id: string;
    objective: any;
    intent_id: any;
    steps: any;
    preconditions: any[];
    postconditions: any[];
    risk_tier: any;
    estimated_duration_ms: number;
    status: string;
    verification_spec: any;
    metadata: {};
    created_at: number;
    updated_at: number;
};
/**
 * Create a single-step plan (simple action wrapper)
 */
export function createSimplePlan({ action, description, args, executor, risk_tier, objective, verification_spec }: {
    action: any;
    description: any;
    args?: {};
    executor: any;
    risk_tier: any;
    objective?: any;
    verification_spec?: any;
}): {
    plan_id: string;
    objective: any;
    intent_id: any;
    steps: any;
    preconditions: any[];
    postconditions: any[];
    risk_tier: any;
    estimated_duration_ms: number;
    status: string;
    verification_spec: any;
    metadata: {};
    created_at: number;
    updated_at: number;
};
//# sourceMappingURL=plan-schema.d.ts.map