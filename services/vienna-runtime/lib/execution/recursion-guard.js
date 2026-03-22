/**
 * Vienna Recursion Guard
 * 
 * Prevents unbounded re-entry via proposal → execution → observation → proposal loops.
 * 
 * Enforces:
 * - Maximum causal depth
 * - Descendant budget per trigger
 * - Idempotency (duplicate detection)
 * - Cooldown windows
 * - Target fingerprint verification
 */

const crypto = require('crypto');

/**
 * Default recursion policy
 */
const DEFAULT_POLICY = {
  max_causal_depth: 3,
  max_descendants_per_root: 5,
  max_retries_per_envelope: 2,
  duplicate_window_seconds: 60,
  cooldown_seconds: 30
};

/**
 * High-risk scope overrides
 */
const SCOPE_OVERRIDES = {
  trading_config: {
    max_descendants_per_root: 1,
    cooldown_seconds: 300
  },
  trading_execution: {
    max_descendants_per_root: 1,
    cooldown_seconds: 120
  },
  system_config: {
    max_descendants_per_root: 2,
    cooldown_seconds: 60
  }
};

class RecursionGuard {
  constructor(options = {}) {
    this.policy = { ...DEFAULT_POLICY, ...options.policy };
    this.scopeOverrides = { ...SCOPE_OVERRIDES, ...options.scopeOverrides };
    
    // In-memory tracking (Phase 7.3 Day 1 - no persistence yet)
    this.triggerBudgets = new Map(); // trigger_id → remaining_budget
    this.idempotencyCache = new Map(); // idempotency_key → { timestamp, envelope_id }
    this.cooldownTracker = new Map(); // target_fingerprint → { timestamp, envelope_id }
    this.targetFingerprints = new Map(); // target → current_fingerprint
  }
  
  /**
   * Validate envelope against recursion policy
   * 
   * @param {object} envelope - Envelope to validate
   * @returns {object} { allowed: boolean, reason?: string, blocked_by?: string }
   */
  validate(envelope) {
    const scope = this._detectScope(envelope);
    const policy = this._getEffectivePolicy(scope);
    
    // Check 1: Causal depth limit
    if (envelope.causal_depth > policy.max_causal_depth) {
      return {
        allowed: false,
        reason: `Causal depth ${envelope.causal_depth} exceeds limit ${policy.max_causal_depth}`,
        blocked_by: 'max_causal_depth',
        scope
      };
    }
    
    // Check 2: Descendant budget (tracked at trigger_id level)
    const triggerBudget = this.triggerBudgets.get(envelope.trigger_id);
    if (triggerBudget !== undefined && triggerBudget <= 0) {
      return {
        allowed: false,
        reason: `Trigger ${envelope.trigger_id} has exhausted descendant budget`,
        blocked_by: 'descendant_budget',
        scope
      };
    }
    
    // Check 3: Envelope-level loop budget
    if (envelope.loop_budget_remaining < 0) {
      return {
        allowed: false,
        reason: `Envelope has exhausted loop budget`,
        blocked_by: 'loop_budget',
        scope
      };
    }
    
    // Check 4: Idempotency (duplicate within window)
    const duplicateCheck = this._checkIdempotency(
      envelope.idempotency_key,
      policy.duplicate_window_seconds
    );
    if (!duplicateCheck.allowed) {
      return {
        allowed: false,
        reason: `Duplicate envelope detected (original: ${duplicateCheck.original_envelope_id})`,
        blocked_by: 'idempotency',
        scope
      };
    }
    
    // Check 5: Cooldown windows (per target)
    const cooldownCheck = this._checkCooldown(
      envelope,
      policy.cooldown_seconds
    );
    if (!cooldownCheck.allowed) {
      return {
        allowed: false,
        reason: cooldownCheck.reason,
        blocked_by: 'cooldown',
        scope
      };
    }
    
    // Check 6: Retry limit
    if (envelope.attempt > policy.max_retries_per_envelope) {
      return {
        allowed: false,
        reason: `Attempt ${envelope.attempt} exceeds retry limit ${policy.max_retries_per_envelope}`,
        blocked_by: 'retry_limit',
        scope
      };
    }
    
    return {
      allowed: true,
      scope
    };
  }
  
  /**
   * Record envelope execution for tracking
   * 
   * Called after successful execution to update budgets and caches.
   * 
   * @param {object} envelope - Executed envelope
   */
  recordExecution(envelope) {
    const now = Date.now();
    
    // Update trigger budget (only for non-retries)
    if (envelope.attempt === 0) {
      const currentBudget = this.triggerBudgets.get(envelope.trigger_id);
      if (currentBudget === undefined) {
        // First envelope for this trigger
        const policy = this._getEffectivePolicy(this._detectScope(envelope));
        this.triggerBudgets.set(
          envelope.trigger_id,
          policy.max_descendants_per_root - 1
        );
      } else {
        // Decrement remaining budget
        this.triggerBudgets.set(envelope.trigger_id, currentBudget - 1);
      }
    }
    
    // Cache idempotency key
    this.idempotencyCache.set(envelope.idempotency_key, {
      timestamp: now,
      envelope_id: envelope.envelope_id
    });
    
    // Update cooldown tracker for each target
    envelope.actions.forEach(action => {
      const fingerprint = this._computeTargetFingerprint(action.target, action);
      this.cooldownTracker.set(fingerprint, {
        timestamp: now,
        envelope_id: envelope.envelope_id,
        target: action.target
      });
    });
    
    // Update target fingerprints (for material change detection)
    envelope.actions.forEach(action => {
      if (this._isMutatingAction(action.type)) {
        const fingerprint = this._computeTargetFingerprint(action.target, action);
        this.targetFingerprints.set(action.target, fingerprint);
      }
    });
  }
  
  /**
   * Cleanup expired cache entries
   * 
   * Should be called periodically to prevent unbounded memory growth.
   */
  cleanup() {
    const now = Date.now();
    const maxAge = Math.max(
      this.policy.duplicate_window_seconds,
      this.policy.cooldown_seconds
    ) * 1000;
    
    // Cleanup idempotency cache
    for (const [key, entry] of this.idempotencyCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.idempotencyCache.delete(key);
      }
    }
    
    // Cleanup cooldown tracker
    for (const [key, entry] of this.cooldownTracker.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cooldownTracker.delete(key);
      }
    }
  }
  
  /**
   * Get current state (for observability)
   */
  getState() {
    return {
      trigger_budgets: Object.fromEntries(this.triggerBudgets),
      active_cooldowns: Array.from(this.cooldownTracker.entries()).map(([fp, entry]) => ({
        target: entry.target,
        envelope_id: entry.envelope_id,
        age_seconds: Math.floor((Date.now() - entry.timestamp) / 1000)
      })),
      cached_idempotency_keys: this.idempotencyCache.size
    };
  }
  
  /**
   * Reset recursion tracking for an envelope (operator override)
   * 
   * Used when operator explicitly requeues a failed envelope from DLQ.
   * 
   * @param {string} envelopeId - Envelope ID to reset
   */
  reset(envelopeId) {
    // Remove from idempotency cache
    for (const [key, entry] of this.idempotencyCache.entries()) {
      if (entry.envelope_id === envelopeId) {
        this.idempotencyCache.delete(key);
      }
    }
    
    // Remove from cooldown tracker
    for (const [key, entry] of this.cooldownTracker.entries()) {
      if (entry.envelope_id === envelopeId) {
        this.cooldownTracker.delete(key);
      }
    }
    
    // Note: trigger budgets are not reset as they track objective-level limits
  }
  
  /**
   * Detect scope from envelope
   */
  _detectScope(envelope) {
    const tradingPatterns = ['kalshi', 'trading', 'kalshi_mm_bot'];
    const configPatterns = ['config', '.json', '.env'];
    
    for (const action of envelope.actions) {
      const target = action.target.toLowerCase();
      
      // Trading scope
      if (tradingPatterns.some(p => target.includes(p))) {
        if (action.type.includes('config') || target.includes('config')) {
          return 'trading_config';
        }
        return 'trading_execution';
      }
      
      // System config scope
      if (configPatterns.some(p => target.includes(p))) {
        return 'system_config';
      }
    }
    
    return 'default';
  }
  
  /**
   * Get effective policy for scope
   */
  _getEffectivePolicy(scope) {
    const overrides = this.scopeOverrides[scope] || {};
    return { ...this.policy, ...overrides };
  }
  
  /**
   * Check idempotency (duplicate detection)
   */
  _checkIdempotency(idempotencyKey, windowSeconds) {
    const cached = this.idempotencyCache.get(idempotencyKey);
    
    if (!cached) {
      return { allowed: true };
    }
    
    const age = (Date.now() - cached.timestamp) / 1000;
    
    if (age < windowSeconds) {
      return {
        allowed: false,
        original_envelope_id: cached.envelope_id,
        age_seconds: Math.floor(age)
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check cooldown windows
   */
  _checkCooldown(envelope, cooldownSeconds) {
    for (const action of envelope.actions) {
      const fingerprint = this._computeTargetFingerprint(action.target, action);
      const cooldownEntry = this.cooldownTracker.get(fingerprint);
      
      if (!cooldownEntry) {
        continue; // No prior execution for this target
      }
      
      const age = (Date.now() - cooldownEntry.timestamp) / 1000;
      
      if (age < cooldownSeconds) {
        // Check for material state change exception
        const materialChange = this._detectMaterialChange(action.target, fingerprint);
        
        if (!materialChange) {
          return {
            allowed: false,
            reason: `Target ${action.target} in cooldown (${Math.floor(cooldownSeconds - age)}s remaining)`,
            prior_envelope: cooldownEntry.envelope_id
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Detect material state change
   * 
   * Material change = target fingerprint changed since prior execution.
   */
  _detectMaterialChange(target, proposedFingerprint) {
    const currentFingerprint = this.targetFingerprints.get(target);
    
    if (!currentFingerprint) {
      // No fingerprint function exists, no exception allowed
      return false;
    }
    
    return currentFingerprint !== proposedFingerprint;
  }
  
  /**
   * Compute target fingerprint
   * 
   * Deterministic hash of target + relevant action state.
   */
  _computeTargetFingerprint(target, action) {
    // Normalize payload by sorting keys
    const payload = action.payload || {};
    const sortedPayload = {};
    Object.keys(payload).sort().forEach(key => {
      sortedPayload[key] = payload[key];
    });
    
    // Include action type and normalized payload in fingerprint
    const content = JSON.stringify({
      target,
      type: action.type,
      payload: sortedPayload
    });
    
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
  
  /**
   * Check if action type is mutating
   */
  _isMutatingAction(actionType) {
    const mutatingTypes = [
      'write_file',
      'edit_file',
      'delete_file',
      'write_db',
      'restart_service',
      'stop_service',
      'exec'
    ];
    
    return mutatingTypes.some(t => actionType.includes(t));
  }
}

class RecursionBlockedError extends Error {
  constructor(reason, blockedBy, scope) {
    super(reason);
    this.name = 'RecursionBlockedError';
    this.blocked_by = blockedBy;
    this.scope = scope;
  }
}

module.exports = { RecursionGuard, RecursionBlockedError, DEFAULT_POLICY, SCOPE_OVERRIDES };
