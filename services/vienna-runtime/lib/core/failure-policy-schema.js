/**
 * Failure Policy Schema
 * 
 * Defines reusable circuit breaker policies for objective reconciliation.
 * Policies are referenced by objectives via policy_ref.
 * 
 * Core principle: Constraints as triggers, not validation rules.
 * Empty constraint = always applies.
 */

const CooldownMode = {
  EXPONENTIAL: 'exponential',
  FIXED: 'fixed',
  LINEAR: 'linear'
};

const KillStrategy = {
  COOPERATIVE_THEN_FORCED: 'cooperative_then_forced',
  FORCED: 'forced'
};

/**
 * Validate failure policy structure
 */
function validateFailurePolicy(policy) {
  const errors = [];

  // Required fields
  if (!policy.policy_id || typeof policy.policy_id !== 'string') {
    errors.push('policy_id is required and must be a string');
  }

  if (!policy.policy_name || typeof policy.policy_name !== 'string') {
    errors.push('policy_name is required and must be a string');
  }

  // Max consecutive failures
  if (policy.max_consecutive_failures !== undefined) {
    if (typeof policy.max_consecutive_failures !== 'number' || policy.max_consecutive_failures < 1) {
      errors.push('max_consecutive_failures must be a positive integer');
    }
  }

  // Cooldown configuration
  if (policy.cooldown) {
    const { mode, base_seconds, multiplier, max_seconds } = policy.cooldown;

    if (mode && !Object.values(CooldownMode).includes(mode)) {
      errors.push(`cooldown.mode must be one of: ${Object.values(CooldownMode).join(', ')}`);
    }

    if (base_seconds !== undefined) {
      if (typeof base_seconds !== 'number' || base_seconds < 0) {
        errors.push('cooldown.base_seconds must be a non-negative number');
      }
    }

    if (mode === CooldownMode.EXPONENTIAL && multiplier !== undefined) {
      if (typeof multiplier !== 'number' || multiplier < 1) {
        errors.push('cooldown.multiplier must be >= 1 for exponential mode');
      }
    }

    if (max_seconds !== undefined) {
      if (typeof max_seconds !== 'number' || max_seconds < 0) {
        errors.push('cooldown.max_seconds must be a non-negative number');
      }
    }
  }

  // Degraded configuration
  if (policy.degraded) {
    const { enter_after_consecutive_failures } = policy.degraded;

    if (enter_after_consecutive_failures !== undefined) {
      if (typeof enter_after_consecutive_failures !== 'number' || enter_after_consecutive_failures < 1) {
        errors.push('degraded.enter_after_consecutive_failures must be a positive integer');
      }
    }
  }

  // Reset configuration
  if (policy.reset) {
    const { on_verified_recovery, on_manual_reset } = policy.reset;

    if (on_verified_recovery !== undefined && typeof on_verified_recovery !== 'boolean') {
      errors.push('reset.on_verified_recovery must be a boolean');
    }

    if (on_manual_reset !== undefined && typeof on_manual_reset !== 'boolean') {
      errors.push('reset.on_manual_reset must be a boolean');
    }
  }

  // Execution timeout configuration (Phase 10.3)
  if (policy.execution) {
    const { timeout_seconds, kill_strategy, grace_period_seconds } = policy.execution;

    if (timeout_seconds !== undefined) {
      if (typeof timeout_seconds !== 'number' || timeout_seconds <= 0) {
        errors.push('execution.timeout_seconds must be a positive number');
      }
    }

    if (kill_strategy !== undefined) {
      if (!Object.values(KillStrategy).includes(kill_strategy)) {
        errors.push(`execution.kill_strategy must be one of: ${Object.values(KillStrategy).join(', ')}`);
      }
    }

    if (grace_period_seconds !== undefined) {
      if (typeof grace_period_seconds !== 'number' || grace_period_seconds < 0) {
        errors.push('execution.grace_period_seconds must be a non-negative number');
      }
    }

    // Require grace_period for cooperative_then_forced
    if (kill_strategy === KillStrategy.COOPERATIVE_THEN_FORCED && grace_period_seconds === undefined) {
      errors.push('execution.grace_period_seconds is required for cooperative_then_forced kill_strategy');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create default failure policy
 */
function createDefaultPolicy() {
  return {
    policy_id: 'default-service-remediation',
    policy_name: 'Default Service Remediation',
    description: 'Standard circuit breaker policy for service health objectives',
    max_consecutive_failures: 3,
    cooldown: {
      mode: CooldownMode.EXPONENTIAL,
      base_seconds: 300,        // 5 minutes
      multiplier: 2,
      max_seconds: 3600         // 1 hour cap
    },
    degraded: {
      enter_after_consecutive_failures: 3
    },
    reset: {
      on_verified_recovery: true,
      on_manual_reset: true
    },
    execution: {
      timeout_seconds: 120,               // 2 minutes
      kill_strategy: KillStrategy.COOPERATIVE_THEN_FORCED,
      grace_period_seconds: 10
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Calculate cooldown duration based on policy and failure count
 */
function calculateCooldownDuration(policy, consecutiveFailures) {
  if (!policy || !policy.cooldown) {
    return 0;
  }

  const { mode, base_seconds, multiplier, max_seconds } = policy.cooldown;
  let duration;

  switch (mode) {
    case CooldownMode.EXPONENTIAL:
      // Formula: base * multiplier^(failures - 1), capped at max
      duration = base_seconds * Math.pow(multiplier || 2, consecutiveFailures - 1);
      break;

    case CooldownMode.LINEAR:
      // Formula: base * failures, capped at max
      duration = base_seconds * consecutiveFailures;
      break;

    case CooldownMode.FIXED:
    default:
      // Fixed duration regardless of failure count
      duration = base_seconds;
      break;
  }

  // Apply cap if configured
  if (max_seconds !== undefined && duration > max_seconds) {
    duration = max_seconds;
  }

  return Math.floor(duration);
}

/**
 * Check if degraded threshold reached
 */
function shouldEnterDegraded(policy, consecutiveFailures) {
  if (!policy || !policy.degraded) {
    return false;
  }

  const threshold = policy.degraded.enter_after_consecutive_failures;
  if (threshold === undefined) {
    return false;
  }

  return consecutiveFailures >= threshold;
}

/**
 * Check if reset should occur
 */
function shouldResetOnRecovery(policy) {
  return policy && policy.reset && policy.reset.on_verified_recovery === true;
}

function shouldResetOnManualReset(policy) {
  return policy && policy.reset && policy.reset.on_manual_reset !== false; // Default true
}

module.exports = {
  CooldownMode,
  KillStrategy,
  validateFailurePolicy,
  createDefaultPolicy,
  calculateCooldownDuration,
  shouldEnterDegraded,
  shouldResetOnRecovery,
  shouldResetOnManualReset
};
