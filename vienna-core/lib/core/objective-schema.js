/**
 * Objective Schema — Phase 9.1
 * 
 * Canonical Objective object for declarative system state management.
 * 
 * Core principle: Objectives are machine-evaluable, not interpretive.
 * No dynamic fields. No flexible structures. Deterministic evaluation only.
 */

const { randomUUID } = require('crypto');

/**
 * Allowed objective statuses (state machine states)
 */
const OBJECTIVE_STATUS = {
  DECLARED: 'declared',
  MONITORING: 'monitoring',
  HEALTHY: 'healthy',
  VIOLATION_DETECTED: 'violation_detected',
  REMEDIATION_TRIGGERED: 'remediation_triggered',
  REMEDIATION_RUNNING: 'remediation_running',
  VERIFICATION: 'verification',
  RESTORED: 'restored',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived'
};

/**
 * Allowed verification strengths
 */
const VERIFICATION_STRENGTH = {
  SERVICE_HEALTH: 'service_health',        // systemctl + TCP check
  HTTP_HEALTHCHECK: 'http_healthcheck',    // HTTP endpoint check
  FULL_VALIDATION: 'full_validation',      // All available checks
  MINIMAL: 'minimal'                       // Basic existence check only
};

/**
 * Objective schema definition
 */
const ObjectiveSchema = {
  objective_id: 'string',           // UUID
  target_id: 'string',              // Entity being managed (e.g., 'openclaw-gateway')
  
  desired_state: 'object',          // Machine-evaluable state specification
  
  remediation_plan: 'string',       // Plan ID to trigger on violation
  evaluation_interval: 'string',    // e.g., '30s', '5m', '1h'
  
  verification_strength: 'string',  // One of VERIFICATION_STRENGTH
  
  status: 'string',                 // One of OBJECTIVE_STATUS
  
  created_at: 'timestamp',
  updated_at: 'timestamp',
  
  // Optional metadata
  priority: 'number',               // For conflict resolution (lower = higher priority)
  owner: 'string',                  // Agent/operator who declared it
  context: 'object'                 // Additional metadata (not evaluation criteria)
};

/**
 * Validate objective structure
 */
function validateObjective(objective) {
  const errors = [];
  
  // Required fields
  if (!objective.objective_id) errors.push('objective_id is required');
  if (!objective.target_id) errors.push('target_id is required');
  if (!objective.desired_state) errors.push('desired_state is required');
  if (!objective.remediation_plan) errors.push('remediation_plan is required');
  if (!objective.evaluation_interval) errors.push('evaluation_interval is required');
  
  // Type validation
  if (objective.objective_id && typeof objective.objective_id !== 'string') {
    errors.push('objective_id must be string');
  }
  if (objective.target_id && typeof objective.target_id !== 'string') {
    errors.push('target_id must be string');
  }
  if (objective.desired_state && typeof objective.desired_state !== 'object') {
    errors.push('desired_state must be object');
  }
  if (objective.remediation_plan && typeof objective.remediation_plan !== 'string') {
    errors.push('remediation_plan must be string');
  }
  if (objective.evaluation_interval && typeof objective.evaluation_interval !== 'string') {
    errors.push('evaluation_interval must be string');
  }
  
  // Enum validation
  if (objective.status && !Object.values(OBJECTIVE_STATUS).includes(objective.status)) {
    errors.push(`status must be one of: ${Object.values(OBJECTIVE_STATUS).join(', ')}`);
  }
  if (objective.verification_strength && 
      !Object.values(VERIFICATION_STRENGTH).includes(objective.verification_strength)) {
    errors.push(`verification_strength must be one of: ${Object.values(VERIFICATION_STRENGTH).join(', ')}`);
  }
  
  // Interval format validation (simple)
  if (objective.evaluation_interval && 
      !/^\d+[smh]$/.test(objective.evaluation_interval)) {
    errors.push('evaluation_interval must be format: number + s/m/h (e.g., "30s", "5m")');
  }
  
  // Priority validation
  if (objective.priority !== undefined && typeof objective.priority !== 'number') {
    errors.push('priority must be number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create new objective with defaults
 */
function createObjective(config) {
  const objective = {
    objective_id: config.objective_id || randomUUID(),
    objective_type: config.objective_type || 'custom',
    target_type: config.target_type || 'service',
    target_id: config.target_id,
    desired_state: config.desired_state,
    remediation_plan: config.remediation_plan,
    evaluation_interval: config.evaluation_interval || '5m',
    verification_strength: config.verification_strength || VERIFICATION_STRENGTH.SERVICE_HEALTH,
    status: OBJECTIVE_STATUS.DECLARED,
    priority: config.priority || 100,
    owner: config.owner || 'system',
    context: config.context || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const validation = validateObjective(objective);
  if (!validation.valid) {
    throw new Error(`Invalid objective: ${validation.errors.join(', ')}`);
  }
  
  return objective;
}

/**
 * Update objective status (state transition)
 */
function updateObjectiveStatus(objective, newStatus, metadata = {}) {
  if (!Object.values(OBJECTIVE_STATUS).includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  
  return {
    ...objective,
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...metadata
  };
}

/**
 * Parse evaluation interval to milliseconds
 */
function parseInterval(interval) {
  const match = interval.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid interval format: ${interval}`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000
  };
  
  return value * multipliers[unit];
}

module.exports = {
  ObjectiveSchema,
  OBJECTIVE_STATUS,
  VERIFICATION_STRENGTH,
  validateObjective,
  createObjective,
  updateObjectiveStatus,
  parseInterval
};
