/**
 * Objective State Machine — Phase 9.2
 * 
 * Deterministic state transitions for objective lifecycle management.
 * 
 * Core principle: Explicit, table-driven transitions. No implicit logic.
 */

const { OBJECTIVE_STATUS } = require('./objective-schema');

/**
 * Valid state transitions (from → to)
 * 
 * Format: { from_state: [allowed_next_states] }
 */
const TRANSITIONS = {
  [OBJECTIVE_STATUS.DECLARED]: [
    OBJECTIVE_STATUS.MONITORING,
    OBJECTIVE_STATUS.SUSPENDED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.MONITORING]: [
    OBJECTIVE_STATUS.HEALTHY,
    OBJECTIVE_STATUS.VIOLATION_DETECTED,
    OBJECTIVE_STATUS.SUSPENDED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.HEALTHY]: [
    OBJECTIVE_STATUS.MONITORING,
    OBJECTIVE_STATUS.VIOLATION_DETECTED,
    OBJECTIVE_STATUS.SUSPENDED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.VIOLATION_DETECTED]: [
    OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
    OBJECTIVE_STATUS.BLOCKED,
    OBJECTIVE_STATUS.SUSPENDED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.REMEDIATION_TRIGGERED]: [
    OBJECTIVE_STATUS.REMEDIATION_RUNNING,
    OBJECTIVE_STATUS.BLOCKED,
    OBJECTIVE_STATUS.FAILED
  ],
  
  [OBJECTIVE_STATUS.REMEDIATION_RUNNING]: [
    OBJECTIVE_STATUS.VERIFICATION,
    OBJECTIVE_STATUS.FAILED,
    OBJECTIVE_STATUS.BLOCKED
  ],
  
  [OBJECTIVE_STATUS.VERIFICATION]: [
    OBJECTIVE_STATUS.RESTORED,
    OBJECTIVE_STATUS.FAILED,
    OBJECTIVE_STATUS.REMEDIATION_TRIGGERED  // Retry if verification fails
  ],
  
  [OBJECTIVE_STATUS.RESTORED]: [
    OBJECTIVE_STATUS.MONITORING,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.FAILED]: [
    OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,  // Manual retry
    OBJECTIVE_STATUS.BLOCKED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.BLOCKED]: [
    OBJECTIVE_STATUS.SUSPENDED,
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.SUSPENDED]: [
    OBJECTIVE_STATUS.MONITORING,  // Resume
    OBJECTIVE_STATUS.ARCHIVED
  ],
  
  [OBJECTIVE_STATUS.ARCHIVED]: [
    // Terminal state — no transitions out
  ]
};

/**
 * Transition metadata (reason categories)
 */
const TRANSITION_REASON = {
  EVALUATION_STARTED: 'evaluation_started',
  SYSTEM_HEALTHY: 'system_healthy',
  SYSTEM_UNHEALTHY: 'system_unhealthy',
  POLICY_APPROVED: 'policy_approved',
  POLICY_DENIED: 'policy_denied',
  EXECUTION_STARTED: 'execution_started',
  EXECUTION_COMPLETED: 'execution_completed',
  EXECUTION_FAILED: 'execution_failed',
  VERIFICATION_PASSED: 'verification_passed',
  VERIFICATION_FAILED: 'verification_failed',
  MANUAL_SUSPENSION: 'manual_suspension',
  MANUAL_RESUME: 'manual_resume',
  MANUAL_ARCHIVE: 'manual_archive',
  MAX_RETRIES_EXCEEDED: 'max_retries_exceeded',
  RESOURCE_UNAVAILABLE: 'resource_unavailable'
};

/**
 * Check if transition is valid
 */
function isValidTransition(fromState, toState) {
  const allowedStates = TRANSITIONS[fromState];
  if (!allowedStates) {
    return false;
  }
  return allowedStates.includes(toState);
}

/**
 * Get allowed next states
 */
function getAllowedTransitions(currentState) {
  return TRANSITIONS[currentState] || [];
}

/**
 * Execute state transition with validation
 */
function transitionState(objective, newState, reason, metadata = {}) {
  const currentState = objective.status;
  
  if (!isValidTransition(currentState, newState)) {
    throw new Error(
      `Invalid transition: ${currentState} → ${newState}. ` +
      `Allowed: [${getAllowedTransitions(currentState).join(', ')}]`
    );
  }
  
  return {
    ...objective,
    status: newState,
    updated_at: new Date().toISOString(),
    last_transition: {
      from: currentState,
      to: newState,
      reason,
      timestamp: new Date().toISOString(),
      metadata
    }
  };
}

/**
 * Check if state is terminal (no outbound transitions)
 */
function isTerminalState(state) {
  const transitions = TRANSITIONS[state];
  return !transitions || transitions.length === 0;
}

/**
 * Check if state indicates active remediation
 */
function isRemediating(state) {
  return [
    OBJECTIVE_STATUS.REMEDIATION_TRIGGERED,
    OBJECTIVE_STATUS.REMEDIATION_RUNNING,
    OBJECTIVE_STATUS.VERIFICATION
  ].includes(state);
}

/**
 * Check if state indicates failure
 */
function isFailed(state) {
  return [
    OBJECTIVE_STATUS.FAILED,
    OBJECTIVE_STATUS.BLOCKED
  ].includes(state);
}

/**
 * Check if state is stable (healthy or monitoring)
 */
function isStable(state) {
  return [
    OBJECTIVE_STATUS.MONITORING,
    OBJECTIVE_STATUS.HEALTHY,
    OBJECTIVE_STATUS.RESTORED
  ].includes(state);
}

/**
 * Get state category
 */
function getStateCategory(state) {
  if (isStable(state)) return 'stable';
  if (isRemediating(state)) return 'remediating';
  if (isFailed(state)) return 'failed';
  if (state === OBJECTIVE_STATUS.SUSPENDED) return 'suspended';
  if (state === OBJECTIVE_STATUS.ARCHIVED) return 'archived';
  return 'transitional';
}

module.exports = {
  TRANSITIONS,
  TRANSITION_REASON,
  isValidTransition,
  getAllowedTransitions,
  transitionState,
  isTerminalState,
  isRemediating,
  isFailed,
  isStable,
  getStateCategory
};
