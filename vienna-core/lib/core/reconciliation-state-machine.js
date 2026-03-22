/**
 * Reconciliation State Machine (Phase 10.1b)
 * 
 * Level-triggered reconciliation control for managed objectives.
 * 
 * Core principle:
 *   Evaluator observes.
 *   Reconciliation gate decides.
 *   Execution performs.
 *   Verification determines truth.
 *   Ledger records lifecycle.
 */

/**
 * Reconciliation Status Values
 */
const ReconciliationStatus = {
  IDLE: 'idle',
  RECONCILING: 'reconciling',
  COOLDOWN: 'cooldown',
  DEGRADED: 'degraded',
  SAFE_MODE: 'safe_mode'
};

/**
 * Transition Reasons
 */
const TransitionReason = {
  // Entry into reconciliation
  DRIFT_DETECTED: 'drift_detected',
  COOLDOWN_EXPIRED: 'cooldown_expired',
  
  // Successful completion
  VERIFICATION_SUCCESS: 'verification_success',
  PASSIVE_RECOVERY: 'passive_recovery',
  
  // Failure paths
  EXECUTION_FAILED: 'execution_failed',
  VERIFICATION_FAILED: 'verification_failed',
  TIMEOUT: 'timeout',
  ATTEMPTS_EXHAUSTED: 'attempts_exhausted',
  
  // Control actions
  MANUAL_RESET: 'manual_reset',
  MANUAL_ESCALATION: 'manual_escalation',
  SAFE_MODE_ENTERED: 'safe_mode_entered',
  SAFE_MODE_RELEASED: 'safe_mode_released',
  
  // System actions
  STALE_RECONCILIATION: 'stale_reconciliation'
};

/**
 * Transition Table
 * 
 * Defines valid state transitions and their reasons.
 * Format: { from: { to: [allowed_reasons] } }
 */
const TransitionTable = {
  [ReconciliationStatus.IDLE]: {
    [ReconciliationStatus.RECONCILING]: [
      TransitionReason.DRIFT_DETECTED,
      TransitionReason.COOLDOWN_EXPIRED
    ],
    [ReconciliationStatus.SAFE_MODE]: [
      TransitionReason.SAFE_MODE_ENTERED
    ],
    [ReconciliationStatus.DEGRADED]: [
      TransitionReason.MANUAL_ESCALATION
    ]
  },
  
  [ReconciliationStatus.RECONCILING]: {
    [ReconciliationStatus.IDLE]: [
      TransitionReason.VERIFICATION_SUCCESS,
      TransitionReason.PASSIVE_RECOVERY
    ],
    [ReconciliationStatus.COOLDOWN]: [
      TransitionReason.EXECUTION_FAILED,
      TransitionReason.VERIFICATION_FAILED,
      TransitionReason.TIMEOUT
    ],
    [ReconciliationStatus.DEGRADED]: [
      TransitionReason.ATTEMPTS_EXHAUSTED,
      TransitionReason.TIMEOUT,
      TransitionReason.MANUAL_ESCALATION,
      TransitionReason.STALE_RECONCILIATION
    ],
    [ReconciliationStatus.SAFE_MODE]: [
      TransitionReason.SAFE_MODE_ENTERED
    ]
  },
  
  [ReconciliationStatus.COOLDOWN]: {
    [ReconciliationStatus.RECONCILING]: [
      TransitionReason.COOLDOWN_EXPIRED
    ],
    [ReconciliationStatus.IDLE]: [
      TransitionReason.PASSIVE_RECOVERY
    ],
    [ReconciliationStatus.DEGRADED]: [
      TransitionReason.MANUAL_ESCALATION,
      TransitionReason.ATTEMPTS_EXHAUSTED
    ],
    [ReconciliationStatus.SAFE_MODE]: [
      TransitionReason.SAFE_MODE_ENTERED
    ]
  },
  
  [ReconciliationStatus.DEGRADED]: {
    [ReconciliationStatus.IDLE]: [
      TransitionReason.MANUAL_RESET
    ],
    [ReconciliationStatus.SAFE_MODE]: [
      TransitionReason.SAFE_MODE_ENTERED
    ]
  },
  
  [ReconciliationStatus.SAFE_MODE]: {
    [ReconciliationStatus.IDLE]: [
      TransitionReason.SAFE_MODE_RELEASED,
      TransitionReason.MANUAL_RESET
    ],
    [ReconciliationStatus.DEGRADED]: [
      TransitionReason.SAFE_MODE_RELEASED // Conservative release policy
    ]
  }
};

/**
 * Default Reconciliation Policy
 */
const DEFAULT_POLICY = {
  max_reconciliation_attempts: 3,
  cooldown_duration_seconds: 300, // 5 minutes
  execution_timeout_seconds: 30,
  verification_timeout_seconds: 10,
  stale_reconciliation_timeout_seconds: 120,
  degraded_requires_manual_reset: true,
  safe_mode_release_conservative: true
};

/**
 * Check if a transition is valid
 * 
 * @param {string} fromStatus - Current reconciliation status
 * @param {string} toStatus - Target reconciliation status
 * @param {string} reason - Transition reason
 * @returns {boolean} True if transition is allowed
 */
function canTransition(fromStatus, toStatus, reason) {
  // Self-transition always invalid
  if (fromStatus === toStatus) {
    return false;
  }
  
  // Check transition table
  const allowedTransitions = TransitionTable[fromStatus];
  if (!allowedTransitions) {
    return false;
  }
  
  const allowedReasons = allowedTransitions[toStatus];
  if (!allowedReasons) {
    return false;
  }
  
  return allowedReasons.includes(reason);
}

/**
 * Get allowed next states for a given status
 * 
 * @param {string} status - Current reconciliation status
 * @returns {string[]} Array of allowed next statuses
 */
function getAllowedNextStates(status) {
  const transitions = TransitionTable[status];
  if (!transitions) {
    return [];
  }
  return Object.keys(transitions);
}

/**
 * Get allowed reasons for a transition
 * 
 * @param {string} fromStatus - Current reconciliation status
 * @param {string} toStatus - Target reconciliation status
 * @returns {string[]} Array of allowed reasons
 */
function getAllowedReasons(fromStatus, toStatus) {
  const transitions = TransitionTable[fromStatus];
  if (!transitions) {
    return [];
  }
  return transitions[toStatus] || [];
}

/**
 * Apply a state transition
 * 
 * Returns an update object with fields to be written to the objective.
 * Does NOT perform the database write itself.
 * 
 * @param {object} objective - Current objective state
 * @param {string} toStatus - Target reconciliation status
 * @param {string} reason - Transition reason
 * @param {object} context - Additional context (execution_id, error, etc.)
 * @returns {object} Update object with reconciliation fields
 * @throws {Error} If transition is invalid
 */
function applyTransition(objective, toStatus, reason, context = {}) {
  const fromStatus = objective.reconciliation_status;
  
  // Validate transition
  if (!canTransition(fromStatus, toStatus, reason)) {
    const allowed = getAllowedNextStates(fromStatus);
    throw new Error(
      `Invalid transition: ${fromStatus} → ${toStatus} (reason: ${reason}). ` +
      `Allowed: [${allowed.join(', ')}]`
    );
  }
  
  const now = new Date().toISOString();
  const updates = {
    reconciliation_status: toStatus,
    updated_at: now
  };
  
  // Status-specific update logic
  switch (toStatus) {
    case ReconciliationStatus.RECONCILING:
      updates.reconciliation_started_at = now;
      updates.reconciliation_generation = (objective.reconciliation_generation || 0) + 1;
      updates.reconciliation_cooldown_until = null;
      updates.reconciliation_last_result = 'execution_started';
      // Attempt count incremented by gate before transition
      break;
      
    case ReconciliationStatus.IDLE:
      // Successful recovery or manual reset
      updates.reconciliation_started_at = null;
      updates.reconciliation_cooldown_until = null;
      updates.reconciliation_last_result = reason === TransitionReason.VERIFICATION_SUCCESS ? 'recovered' : reason;
      
      if (reason === TransitionReason.VERIFICATION_SUCCESS) {
        updates.reconciliation_attempt_count = 0; // Reset on success
        updates.reconciliation_last_verified_at = now;
        updates.reconciliation_last_error = null;
      }
      
      if (reason === TransitionReason.MANUAL_RESET) {
        updates.reconciliation_attempt_count = 0;
        updates.reconciliation_last_error = null;
      }
      break;
      
    case ReconciliationStatus.COOLDOWN:
      // Calculate cooldown expiry
      const cooldownSeconds = context.cooldown_seconds || DEFAULT_POLICY.cooldown_duration_seconds;
      const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
      
      updates.reconciliation_started_at = null;
      updates.reconciliation_cooldown_until = cooldownUntil;
      updates.reconciliation_last_result = reason;
      
      if (context.error) {
        updates.reconciliation_last_error = context.error;
      }
      if (context.execution_id) {
        updates.reconciliation_last_execution_id = context.execution_id;
      }
      break;
      
    case ReconciliationStatus.DEGRADED:
      updates.reconciliation_started_at = null;
      updates.reconciliation_cooldown_until = null;
      updates.reconciliation_last_result = 'degraded';
      
      if (context.error) {
        updates.reconciliation_last_error = context.error;
      }
      if (context.execution_id) {
        updates.reconciliation_last_execution_id = context.execution_id;
      }
      break;
      
    case ReconciliationStatus.SAFE_MODE:
      // Preserve current state but block remediation
      updates.reconciliation_last_result = 'safe_mode';
      break;
  }
  
  return updates;
}

/**
 * Check if objective is eligible for reconciliation
 * 
 * @param {object} objective - Objective state
 * @param {object} options - Check options (global_safe_mode, current_time)
 * @returns {object} { eligible: boolean, reason: string }
 */
function isEligibleForReconciliation(objective, options = {}) {
  const { global_safe_mode = false, current_time = null } = options;
  const now = current_time || new Date().toISOString();
  
  // Check global safe mode
  if (global_safe_mode) {
    return { eligible: false, reason: 'global_safe_mode' };
  }
  
  // Check manual hold
  if (objective.manual_hold) {
    return { eligible: false, reason: 'manual_hold' };
  }
  
  // Check reconciliation status
  const status = objective.reconciliation_status;
  
  if (status === ReconciliationStatus.RECONCILING) {
    return { eligible: false, reason: 'in_flight' };
  }
  
  if (status === ReconciliationStatus.COOLDOWN) {
    // Check if cooldown expired
    if (objective.reconciliation_cooldown_until && now < objective.reconciliation_cooldown_until) {
      return { eligible: false, reason: 'cooldown_active' };
    }
    // Cooldown expired, eligible
    return { eligible: true, reason: 'cooldown_expired' };
  }
  
  if (status === ReconciliationStatus.DEGRADED) {
    return { eligible: false, reason: 'degraded' };
  }
  
  if (status === ReconciliationStatus.SAFE_MODE) {
    return { eligible: false, reason: 'safe_mode' };
  }
  
  if (status === ReconciliationStatus.IDLE) {
    return { eligible: true, reason: 'idle' };
  }
  
  return { eligible: false, reason: 'unknown_status' };
}

/**
 * Check if objective is in a terminal state (requires intervention)
 * 
 * @param {object} objective - Objective state
 * @returns {boolean} True if terminal
 */
function isTerminalState(objective) {
  return objective.reconciliation_status === ReconciliationStatus.DEGRADED;
}

/**
 * Check if objective is currently remediating
 * 
 * @param {object} objective - Objective state
 * @returns {boolean} True if remediating
 */
function isRemediating(objective) {
  return objective.reconciliation_status === ReconciliationStatus.RECONCILING;
}

/**
 * Check if objective is in cooldown
 * 
 * @param {object} objective - Objective state
 * @param {string} current_time - Current time (ISO string)
 * @returns {boolean} True if in active cooldown
 */
function isInCooldown(objective, current_time = null) {
  const now = current_time || new Date().toISOString();
  return objective.reconciliation_status === ReconciliationStatus.COOLDOWN &&
         objective.reconciliation_cooldown_until &&
         now < objective.reconciliation_cooldown_until;
}

/**
 * Check if objective has retry attempts remaining
 * 
 * @param {object} objective - Objective state
 * @param {object} policy - Reconciliation policy
 * @returns {boolean} True if attempts remain
 */
function hasAttemptsRemaining(objective, policy = DEFAULT_POLICY) {
  const attemptCount = objective.reconciliation_attempt_count || 0;
  return attemptCount < policy.max_reconciliation_attempts;
}

/**
 * Check if reconciliation is stale (hung)
 * 
 * @param {object} objective - Objective state
 * @param {object} policy - Reconciliation policy
 * @param {string} current_time - Current time (ISO string)
 * @returns {boolean} True if stale
 */
function isStaleReconciliation(objective, policy = DEFAULT_POLICY, current_time = null) {
  if (objective.reconciliation_status !== ReconciliationStatus.RECONCILING) {
    return false;
  }
  
  if (!objective.reconciliation_started_at) {
    return false;
  }
  
  const now = current_time ? new Date(current_time) : new Date();
  const startedAt = new Date(objective.reconciliation_started_at);
  const elapsedSeconds = (now - startedAt) / 1000;
  
  return elapsedSeconds > policy.stale_reconciliation_timeout_seconds;
}

/**
 * Determine next status after failure
 * 
 * @param {object} objective - Current objective state
 * @param {object} policy - Reconciliation policy
 * @returns {string} Next status (cooldown or degraded)
 */
function determineFailureStatus(objective, policy = DEFAULT_POLICY) {
  if (hasAttemptsRemaining(objective, policy)) {
    return ReconciliationStatus.COOLDOWN;
  } else {
    return ReconciliationStatus.DEGRADED;
  }
}

/**
 * Get reconciliation state summary for operator visibility
 * 
 * @param {object} objective - Objective state
 * @returns {object} Human-readable summary
 */
function getReconciliationSummary(objective) {
  const status = objective.reconciliation_status;
  const attemptCount = objective.reconciliation_attempt_count || 0;
  const lastResult = objective.reconciliation_last_result;
  const lastError = objective.reconciliation_last_error;
  const cooldownUntil = objective.reconciliation_cooldown_until;
  const generation = objective.reconciliation_generation || 0;
  
  return {
    status,
    attempt_count: attemptCount,
    last_result: lastResult,
    last_error: lastError,
    cooldown_until: cooldownUntil,
    generation,
    manual_hold: objective.manual_hold || false,
    is_terminal: isTerminalState(objective),
    is_remediating: isRemediating(objective),
    is_in_cooldown: isInCooldown(objective)
  };
}

module.exports = {
  // Enums
  ReconciliationStatus,
  TransitionReason,
  TransitionTable,
  DEFAULT_POLICY,
  
  // Transition logic
  canTransition,
  getAllowedNextStates,
  getAllowedReasons,
  applyTransition,
  
  // State checks
  isEligibleForReconciliation,
  isTerminalState,
  isRemediating,
  isInCooldown,
  hasAttemptsRemaining,
  isStaleReconciliation,
  
  // Helpers
  determineFailureStatus,
  getReconciliationSummary
};
