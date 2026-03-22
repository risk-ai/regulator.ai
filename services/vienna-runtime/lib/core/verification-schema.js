/**
 * Verification Schema
 * 
 * Defines verification structures for Phase 8.2.
 * 
 * Core principle:
 *   Execution tells you what the system tried.
 *   Verification tells you what became true.
 * 
 * Three distinct objects:
 *   1. ExecutionResult — what executor reports
 *   2. VerificationResult — what verifier observes
 *   3. WorkflowOutcome — final conclusion
 * 
 * Pipeline:
 *   Plan → Executor → ExecutionResult → Verification Engine → VerificationResult → WorkflowOutcome
 */

const crypto = require('crypto');

/**
 * Generate unique verification ID
 */
function generateVerificationId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `verify_${timestamp}_${random}`;
}

/**
 * Generate unique workflow outcome ID
 */
function generateOutcomeId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `outcome_${timestamp}_${random}`;
}

/**
 * Verification Strength Levels
 * 
 * procedural — Command returned success
 * local_state — System state changed as expected
 * service_health — Dependent endpoint responds correctly
 * objective_stability — Desired state persists for time window
 */
const VerificationStrength = {
  PROCEDURAL: 'procedural',
  LOCAL_STATE: 'local_state',
  SERVICE_HEALTH: 'service_health',
  OBJECTIVE_STABILITY: 'objective_stability'
};

/**
 * Verification Status
 */
const VerificationStatus = {
  SUCCESS: 'success',
  FAILED: 'failed',
  INCONCLUSIVE: 'inconclusive',
  TIMED_OUT: 'timed_out',
  SKIPPED: 'skipped'
};

/**
 * Workflow Status
 */
const WorkflowStatus = {
  PLANNED: 'planned',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  DISPATCHED: 'dispatched',
  EXECUTING: 'executing',
  EXECUTION_FAILED: 'execution_failed',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  COMPLETED_WITH_WARNINGS: 'completed_with_warnings',
  VERIFICATION_FAILED: 'verification_failed',
  INCONCLUSIVE: 'inconclusive',
  TIMED_OUT: 'timed_out',
  CANCELLED: 'cancelled',
  DENIED: 'denied'
};

/**
 * Postcondition Check Type
 */
const CheckType = {
  SYSTEMD_ACTIVE: 'systemd_active',
  TCP_PORT_OPEN: 'tcp_port_open',
  HTTP_HEALTHCHECK: 'http_healthcheck',
  FILE_EXISTS: 'file_exists',
  FILE_CONTAINS: 'file_contains',
  STATE_GRAPH_VALUE: 'state_graph_value',
  CUSTOM: 'custom'
};

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
function createVerificationTask({
  plan_id,
  execution_id,
  objective,
  verification_type,
  scope,
  postconditions,
  verification_strength = VerificationStrength.SERVICE_HEALTH,
  timeout_ms = 15000,
  stability_window_ms = 0,
  retry_policy = { max_attempts: 3, backoff_ms: 1000 },
  created_by = 'vienna-core'
}) {
  return {
    verification_id: generateVerificationId(),
    plan_id,
    execution_id,
    objective,
    verification_type,
    scope,
    postconditions,
    verification_strength,
    timeout_ms,
    stability_window_ms,
    retry_policy,
    created_at: Date.now(),
    created_by
  };
}

/**
 * Create VerificationResult
 */
function createVerificationResult({
  verification_id,
  plan_id,
  execution_id,
  status,
  objective_achieved,
  verification_strength_achieved,
  started_at,
  completed_at,
  checks,
  stability = null,
  summary,
  metadata = {}
}) {
  return {
    verification_id,
    plan_id,
    execution_id,
    status,
    objective_achieved,
    verification_strength_achieved,
    started_at,
    completed_at,
    duration_ms: completed_at - started_at,
    checks,
    stability,
    summary,
    metadata
  };
}

/**
 * Create WorkflowOutcome
 */
function createWorkflowOutcome({
  plan_id,
  execution_id = null,
  verification_id = null,
  workflow_status,
  objective_achieved,
  risk_tier,
  execution_status = null,
  verification_status = null,
  operator_visible_summary,
  next_actions = [],
  metadata = {}
}) {
  return {
    outcome_id: generateOutcomeId(),
    plan_id,
    execution_id,
    verification_id,
    workflow_status,
    objective_achieved,
    risk_tier,
    execution_status,
    verification_status,
    finalized_at: Date.now(),
    operator_visible_summary,
    next_actions,
    metadata
  };
}

/**
 * Derive workflow status from execution and verification
 */
function deriveWorkflowStatus(executionStatus, verificationStatus) {
  // Execution failed
  if (executionStatus === 'failed' || executionStatus === 'error') {
    return WorkflowStatus.EXECUTION_FAILED;
  }

  // No verification (execution-only)
  if (!verificationStatus) {
    return executionStatus === 'success' 
      ? WorkflowStatus.COMPLETED_WITH_WARNINGS 
      : WorkflowStatus.EXECUTION_FAILED;
  }

  // Verification results
  if (verificationStatus === VerificationStatus.SUCCESS) {
    return WorkflowStatus.COMPLETED;
  }

  if (verificationStatus === VerificationStatus.FAILED) {
    return WorkflowStatus.VERIFICATION_FAILED;
  }

  if (verificationStatus === VerificationStatus.TIMED_OUT) {
    return WorkflowStatus.TIMED_OUT;
  }

  if (verificationStatus === VerificationStatus.INCONCLUSIVE) {
    return WorkflowStatus.INCONCLUSIVE;
  }

  if (verificationStatus === VerificationStatus.SKIPPED) {
    return WorkflowStatus.COMPLETED_WITH_WARNINGS;
  }

  return WorkflowStatus.INCONCLUSIVE;
}

/**
 * Validate VerificationTask
 */
function validateVerificationTask(task) {
  const errors = [];

  if (!task.verification_id) errors.push('verification_id required');
  if (!task.plan_id) errors.push('plan_id required');
  if (!task.objective) errors.push('objective required');
  if (!task.verification_type) errors.push('verification_type required');
  if (!Array.isArray(task.postconditions)) errors.push('postconditions must be array');
  if (!Object.values(VerificationStrength).includes(task.verification_strength)) {
    errors.push('verification_strength must be valid');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateVerificationId,
  generateOutcomeId,
  VerificationStrength,
  VerificationStatus,
  WorkflowStatus,
  CheckType,
  createVerificationTask,
  createVerificationResult,
  createWorkflowOutcome,
  deriveWorkflowStatus,
  validateVerificationTask
};
