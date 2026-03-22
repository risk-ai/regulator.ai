/**
 * Plan Schema
 * 
 * Defines the structure of execution plans.
 * Plans sit between IntentObject and Warrant in the execution pipeline.
 * 
 * Pipeline: Intent → Plan → Warrant → Envelope → Executor → Verification
 */

const crypto = require('crypto');

/**
 * Generate unique plan ID
 */
function generatePlanId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `plan_${timestamp}_${random}`;
}

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
function validatePlan(plan) {
  const errors = [];

  // Required fields
  if (!plan.plan_id || typeof plan.plan_id !== 'string') {
    errors.push('plan_id is required and must be a string');
  }

  if (!plan.objective || typeof plan.objective !== 'string') {
    errors.push('objective is required and must be a string');
  }

  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    errors.push('steps is required and must be a non-empty array');
  }

  if (!['T0', 'T1', 'T2'].includes(plan.risk_tier)) {
    errors.push('risk_tier must be T0, T1, or T2');
  }

  if (!['pending', 'approved', 'executing', 'completed', 'failed', 'cancelled'].includes(plan.status)) {
    errors.push('status must be valid plan status');
  }

  // Validate steps
  if (Array.isArray(plan.steps)) {
    plan.steps.forEach((step, idx) => {
      if (typeof step.step_number !== 'number') {
        errors.push(`Step ${idx}: step_number must be a number`);
      }

      if (!step.action || typeof step.action !== 'string') {
        errors.push(`Step ${idx}: action is required and must be a string`);
      }

      if (!step.description || typeof step.description !== 'string') {
        errors.push(`Step ${idx}: description is required and must be a string`);
      }

      if (!['local', 'openclaw'].includes(step.executor)) {
        errors.push(`Step ${idx}: executor must be local or openclaw`);
      }

      if (typeof step.required !== 'boolean') {
        errors.push(`Step ${idx}: required must be a boolean`);
      }

      if (!Array.isArray(step.verification)) {
        errors.push(`Step ${idx}: verification must be an array`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new Plan object
 */
function createPlan({
  objective,
  intent_id = null,
  steps,
  preconditions = [],
  postconditions = [],
  risk_tier,
  estimated_duration_ms = 10000,
  verification_spec = null,
  metadata = {}
}) {
  const now = Date.now();

  return {
    plan_id: generatePlanId(),
    objective,
    intent_id,
    steps,
    preconditions,
    postconditions,
    risk_tier,
    estimated_duration_ms,
    status: 'pending',
    verification_spec,
    metadata,
    created_at: now,
    updated_at: now
  };
}

/**
 * Create a single-step plan (simple action wrapper)
 */
function createSimplePlan({
  action,
  description,
  args = {},
  executor,
  risk_tier,
  objective = null,
  verification_spec = null
}) {
  const step = {
    step_number: 1,
    action,
    description,
    args,
    executor,
    timeout_ms: 10000,
    required: true,
    verification: []
  };

  return createPlan({
    objective: objective || description,
    steps: [step],
    preconditions: [],
    postconditions: [],
    risk_tier,
    estimated_duration_ms: 10000,
    verification_spec,
    metadata: { plan_type: 'simple' }
  });
}

module.exports = {
  generatePlanId,
  validatePlan,
  createPlan,
  createSimplePlan
};
