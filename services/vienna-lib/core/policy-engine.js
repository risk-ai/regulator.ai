/**
 * Policy Engine
 * 
 * Single canonical policy evaluation layer for Vienna OS.
 * All execution admissibility decisions happen here.
 * 
 * Core Invariant:
 * All execution admissibility decisions must be made by the Policy Engine
 * before warrant issuance.
 * 
 * Flow:
 * Intent → Plan → PolicyEngine.evaluate() → PolicyDecision → Warrant → Execution
 */

const {
  DECISION_TYPES,
  VERIFICATION_STRENGTH,
  policyMatchesPlan
} = require('./policy-schema');

const {
  createPolicyDecision,
  mergeRequirements
} = require('./policy-decision-schema');

class PolicyEngine {
  /**
   * @param {Object} params
   * @param {Object} params.stateGraph - State Graph instance for ledger queries
   * @param {Function} params.loadPolicies - Function to load active policies
   * @param {Object} [params.auditLogger] - Audit logger instance
   */
  constructor({ stateGraph, loadPolicies, auditLogger = null }) {
    this.stateGraph = stateGraph;
    this.loadPolicies = loadPolicies;
    this.auditLogger = auditLogger;
    
    // Policy evaluation cache with TTL
    this.evaluationCache = new Map(); // key -> { result, timestamp, ttl }
    this.defaultCacheTtlMs = 5 * 60 * 1000; // 5 minutes
    
    // Policy version tracking
    this.policyVersions = new Map(); // policy_id -> version_number
    this.publishedPolicies = new Set(); // policy_id set of published policies
  }

  /**
   * Evaluate a plan against all applicable policies
   * 
   * @param {Object} plan - Plan object to evaluate
   * @param {Object} context - Additional context
   * @param {Object} [context.actor] - Actor information
   * @param {Object} [context.runtime_context] - Runtime flags
   * @param {Object} [options] - Evaluation options
   * @param {boolean} [options.skipCache] - Skip evaluation cache
   * @returns {Promise<PolicyDecision>}
   */
  async evaluate(plan, context = {}, options = {}) {
    const startTime = Date.now();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check evaluation cache first (unless explicitly skipped)
    if (!options.skipCache) {
      const cacheKey = this._generateCacheKey(plan, context);
      const cached = this._getCachedEvaluation(cacheKey);
      
      if (cached) {
        this._auditPolicyEvaluation({
          evaluation_id: evaluationId,
          plan_id: plan.plan_id,
          cache_hit: true,
          cache_key: cacheKey,
          decision: cached.decision,
          evaluation_time_ms: Date.now() - startTime
        });
        
        return cached;
      }
    }

    // Load all active policies
    const allPolicies = await this.loadPolicies();
    const activePolicies = this._filterActivePolicies(allPolicies);

    // Find matching policies
    const matchedPolicies = activePolicies.filter(policy => 
      policyMatchesPlan(policy, plan)
    );

    // Detect policy conflicts early
    const conflictDetection = this._detectPolicyConflicts(matchedPolicies, plan);

    // If no policies match, default to allow (for now - may change to deny)
    if (matchedPolicies.length === 0) {
      const decision = this._createNoMatchDecision(plan, startTime);
      this._auditPolicyEvaluation({
        evaluation_id: evaluationId,
        plan_id: plan.plan_id,
        matched_policies: [],
        evaluated_policies: [],
        final_policy: null,
        decision: decision.decision,
        conflicts_detected: conflictDetection,
        evaluation_time_ms: Date.now() - startTime
      });
      return decision;
    }

    // Evaluate conditions for matched policies
    const evaluatedPolicies = [];
    const ledgerQueryResults = {};
    const policyEvaluationDetails = [];

    for (const policy of matchedPolicies) {
      const conditionsMet = await this._evaluateConditions(
        policy,
        plan,
        context,
        ledgerQueryResults
      );

      policyEvaluationDetails.push({
        policy_id: policy.policy_id,
        policy_version: policy.policy_version || 1,
        matched: true,
        conditions_met: conditionsMet,
        decision: conditionsMet ? policy.decision : null
      });

      if (conditionsMet) {
        evaluatedPolicies.push(policy);
      }
    }

    // If no policies passed conditions, default to allow
    if (evaluatedPolicies.length === 0) {
      const decision = this._createNoMatchDecision(plan, startTime);
      this._auditPolicyEvaluation({
        evaluation_id: evaluationId,
        plan_id: plan.plan_id,
        matched_policies: matchedPolicies.map(p => ({ policy_id: p.policy_id, version: p.policy_version || 1 })),
        evaluated_policies: [],
        final_policy: null,
        decision: decision.decision,
        policy_details: policyEvaluationDetails,
        conflicts_detected: conflictDetection,
        evaluation_time_ms: Date.now() - startTime
      });
      return decision;
    }

    // Resolve conflicts if multiple policies matched
    const finalPolicy = this._resolveConflicts(evaluatedPolicies);
    const conflictResolution = evaluatedPolicies.length > 1 ? {
      num_policies_matched: evaluatedPolicies.length,
      matched_policy_ids: evaluatedPolicies.map(p => p.policy_id),
      resolution_strategy: this._getResolutionStrategy(evaluatedPolicies, finalPolicy),
      explanation: `${evaluatedPolicies.length} policies matched, selected policy_id=${finalPolicy.policy_id} by ${this._getResolutionStrategy(evaluatedPolicies, finalPolicy)}`
    } : undefined;

    // Build final decision
    const decision = this._buildDecision(
      finalPolicy,
      plan,
      context,
      ledgerQueryResults,
      conflictResolution,
      startTime
    );

    // Cache the evaluation result if conditions are met
    if (!options.skipCache) {
      const cacheKey = this._generateCacheKey(plan, context);
      const cacheTtl = finalPolicy.cache_ttl_ms || this.defaultCacheTtlMs;
      this._setCachedEvaluation(cacheKey, decision, cacheTtl);
    }

    // Audit the complete evaluation
    this._auditPolicyEvaluation({
      evaluation_id: evaluationId,
      plan_id: plan.plan_id,
      matched_policies: matchedPolicies.map(p => ({ policy_id: p.policy_id, version: p.policy_version || 1 })),
      evaluated_policies: evaluatedPolicies.map(p => ({ policy_id: p.policy_id, version: p.policy_version || 1 })),
      final_policy: { policy_id: finalPolicy.policy_id, version: finalPolicy.policy_version || 1 },
      decision: decision.decision,
      policy_details: policyEvaluationDetails,
      conflicts_detected: conflictDetection,
      conflict_resolution: conflictResolution,
      evaluation_time_ms: Date.now() - startTime
    });

    return decision;
  }

  /**
   * Evaluate policy conditions
   * 
   * @private
   */
  async _evaluateConditions(policy, plan, context, ledgerQueryResults) {
    const conditions = policy.conditions || {};

    // Actor type check
    if (conditions.actor_type && context.actor) {
      if (!conditions.actor_type.includes(context.actor.type)) {
        return false;
      }
    }

    // Verification strength check
    if (conditions.required_verification_strength) {
      const planStrength = plan.verification_spec?.strength || 'none';
      const requiredStrength = conditions.required_verification_strength;
      
      const strengths = Object.values(VERIFICATION_STRENGTH);
      const planIdx = strengths.indexOf(planStrength);
      const requiredIdx = strengths.indexOf(requiredStrength);
      
      if (planIdx < requiredIdx) {
        return false;
      }
    }

    // Trading window check
    if (conditions.trading_window_active !== undefined) {
      const tradingActive = context.runtime_context?.trading_window_active || false;
      if (tradingActive !== conditions.trading_window_active) {
        return false;
      }
    }

    // Ledger constraints
    // Only evaluate if there are actual constraint properties defined
    if (policy.ledger_constraints && Object.keys(policy.ledger_constraints).length > 0) {
      const constraintsViolated = await this._evaluateLedgerConstraints(
        policy.ledger_constraints,
        plan,
        ledgerQueryResults
      );
      
      // If constraints are NOT violated, policy should not apply
      if (!constraintsViolated) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate ledger constraints
   * 
   * Constraints are TRIGGER CONDITIONS for the policy.
   * - Return TRUE when constraint is VIOLATED (trigger met, policy should apply)
   * - Return FALSE when constraint is SATISFIED (no trigger, policy should not apply)
   * 
   * @private
   */
  async _evaluateLedgerConstraints(constraints, plan, ledgerQueryResults) {
    const { objective } = plan;
    const lookbackWindow = constraints.lookback_window || '1h';
    const lookbackMs = this._parseLookbackWindow(lookbackWindow);
    const lookbackTime = Date.now() - lookbackMs;

    // Check max executions per hour/day
    if (constraints.max_executions_per_hour || constraints.max_executions_per_day) {
      const cacheKey = `executions_${objective}_${lookbackWindow}`;
      
      if (!ledgerQueryResults[cacheKey]) {
        const recentExecutions = await this.stateGraph.listExecutionLedgerSummaries({
          objective,
          started_after: lookbackTime
        });
        ledgerQueryResults[cacheKey] = recentExecutions;
      }

      const executions = ledgerQueryResults[cacheKey];
      
      if (constraints.max_executions_per_hour) {
        const hourMs = 60 * 60 * 1000;
        const hourAgo = Date.now() - hourMs;
        const executionsLastHour = executions.filter(e => e.started_at >= hourAgo);
        
        // Constraint violated: limit hit, policy should apply
        if (executionsLastHour.length >= constraints.max_executions_per_hour) {
          return true;
        }
      }

      if (constraints.max_executions_per_day) {
        const dayMs = 24 * 60 * 60 * 1000;
        const dayAgo = Date.now() - dayMs;
        const executionsLastDay = executions.filter(e => e.started_at >= dayAgo);
        
        // Constraint violated: limit hit, policy should apply
        if (executionsLastDay.length >= constraints.max_executions_per_day) {
          return true;
        }
      }
    }

    // Check consecutive failures
    if (constraints.max_failures_before_block) {
      const cacheKey = `recent_${objective}`;
      
      if (!ledgerQueryResults[cacheKey]) {
        const recent = await this.stateGraph.listExecutionLedgerSummaries({
          objective,
          limit: constraints.max_failures_before_block
        });
        ledgerQueryResults[cacheKey] = recent;
      }

      const recent = ledgerQueryResults[cacheKey];
      const allFailed = recent.length >= constraints.max_failures_before_block &&
                        recent.every(e => e.execution_status === 'failed');
      
      // Constraint violated: consecutive failures detected, policy should apply
      if (allFailed) {
        return true;
      }
    }

    // Check last execution status
    if (constraints.must_not_have_status) {
      const cacheKey = `last_${objective}`;
      
      if (!ledgerQueryResults[cacheKey]) {
        const last = await this.stateGraph.listExecutionLedgerSummaries({
          objective,
          limit: 1
        });
        ledgerQueryResults[cacheKey] = last[0] || null;
      }

      const lastExecution = ledgerQueryResults[cacheKey];
      
      // Constraint violated: forbidden status detected, policy should apply
      if (lastExecution && lastExecution.execution_status === constraints.must_not_have_status) {
        return true;
      }
    }

    // No constraints triggered, policy should not apply
    return false;
  }

  /**
   * Parse lookback window string to milliseconds
   * 
   * @private
   */
  _parseLookbackWindow(window) {
    const match = window.match(/^(\d+)(m|h|d)$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Resolve conflicts when multiple policies match
   * Uses deterministic conflict resolution:
   * 1. Deny beats allow
   * 2. Highest priority wins
   * 3. Requirements merge if compatible
   * 
   * @private
   */
  _resolveConflicts(policies) {
    if (policies.length === 1) {
      return policies[0];
    }

    // Check for any DENY decisions
    const denyPolicies = policies.filter(p => p.decision === DECISION_TYPES.DENY);
    if (denyPolicies.length > 0) {
      // Return highest priority deny
      return denyPolicies.reduce((highest, current) => 
        current.priority > highest.priority ? current : highest
      );
    }

    // No denies - return highest priority
    return policies.reduce((highest, current) => 
      current.priority > highest.priority ? current : highest
    );
  }

  /**
   * Get resolution strategy description
   * 
   * @private
   */
  _getResolutionStrategy(policies, selected) {
    const hasDeny = policies.some(p => p.decision === DECISION_TYPES.DENY);
    
    if (hasDeny && selected.decision === DECISION_TYPES.DENY) {
      return 'deny_wins';
    }
    
    return 'highest_priority';
  }

  /**
   * Build final policy decision
   * 
   * @private
   */
  _buildDecision(policy, plan, context, ledgerQueryResults, conflictResolution, startTime) {
    const reasons = this._buildReasons(policy, plan, context, ledgerQueryResults);
    const requirements = { ...policy.requirements };

    // Build evaluated context
    const evaluated_context = {
      plan_summary: {
        plan_id: plan.plan_id,
        objective: plan.objective,
        environment: plan.environment,
        risk_tier: plan.risk_tier,
        num_steps: plan.steps.length
      },
      ledger_query_results: this._sanitizeLedgerResults(ledgerQueryResults),
      runtime_context: context.runtime_context || {},
      evaluation_time_ms: Date.now() - startTime
    };

    return createPolicyDecision({
      plan_id: plan.plan_id,
      policy_id: policy.policy_id,
      policy_version: policy.policy_version,
      decision: policy.decision,
      reasons,
      requirements,
      evaluated_context,
      conflict_resolution: conflictResolution
    });
  }

  /**
   * Build human-readable reasons
   * 
   * @private
   */
  _buildReasons(policy, plan, context, ledgerQueryResults) {
    const reasons = [];

    // Policy matched
    reasons.push(`Policy ${policy.policy_id} matched for objective=${plan.objective}`);

    // Environment
    if (plan.environment) {
      reasons.push(`Environment: ${plan.environment}`);
    }

    // Risk tier
    if (plan.risk_tier) {
      reasons.push(`Risk tier: ${plan.risk_tier}`);
    }

    // Actor
    if (context.actor) {
      reasons.push(`Actor type: ${context.actor.type}`);
    }

    // Ledger constraints
    for (const [key, value] of Object.entries(ledgerQueryResults)) {
      if (Array.isArray(value)) {
        reasons.push(`Recent executions (${key}): ${value.length}`);
      }
    }

    // Requirements
    if (policy.requirements.approval_required) {
      reasons.push('Approval required by policy');
    }

    if (policy.requirements.required_verification_strength) {
      reasons.push(`Verification strength required: ${policy.requirements.required_verification_strength}`);
    }

    return reasons;
  }

  /**
   * Sanitize ledger results for storage (remove full objects, keep counts)
   * 
   * @private
   */
  _sanitizeLedgerResults(ledgerQueryResults) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(ledgerQueryResults)) {
      if (Array.isArray(value)) {
        sanitized[key] = {
          count: value.length,
          sample: value.slice(0, 2).map(e => ({
            execution_id: e.execution_id,
            status: e.status,
            started_at: e.started_at
          }))
        };
      } else if (value && typeof value === 'object') {
        sanitized[key] = {
          execution_id: value.execution_id,
          status: value.status,
          started_at: value.started_at
        };
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Create a no-match decision (default allow)
   * 
   * @private
   */
  _createNoMatchDecision(plan, startTime) {
    // FIX #3: Respect tenant-level default_policy_decision setting.
    // New tenants default to DENY (secure posture). Legacy tenants can opt into ALLOW.
    let defaultDecision = DECISION_TYPES.ALLOW;
    let defaultReason = 'No matching policy found, defaulting to allow (legacy)';

    // Check tenant config for default_policy_decision
    if (plan.tenant_id && this.stateGraph) {
      try {
        const tenant = typeof this.stateGraph.getTenant === 'function'
          ? this.stateGraph.getTenant(plan.tenant_id)
          : null;
        if (tenant && tenant.default_policy_decision === 'deny') {
          defaultDecision = DECISION_TYPES.DENY;
          defaultReason = 'No matching policy found, tenant default is deny';
        } else if (!tenant) {
          // Unknown tenant — default deny for safety
          defaultDecision = DECISION_TYPES.DENY;
          defaultReason = 'No matching policy found, unknown tenant defaults to deny';
        }
      } catch (err) {
        // On error reading tenant config, fail safe to deny
        defaultDecision = DECISION_TYPES.DENY;
        defaultReason = 'No matching policy found, tenant lookup failed — defaulting to deny';
      }
    }

    return createPolicyDecision({
      plan_id: plan.plan_id,
      policy_id: null,
      policy_version: null,
      decision: defaultDecision,
      reasons: [defaultReason],
      requirements: {
        approval_required: defaultDecision === DECISION_TYPES.DENY
      },
      evaluated_context: {
        plan_summary: {
          plan_id: plan.plan_id,
          objective: plan.objective,
          environment: plan.environment,
          risk_tier: plan.risk_tier
        },
        evaluation_time_ms: Date.now() - startTime,
        default_policy_decision: defaultDecision === DECISION_TYPES.DENY ? 'deny' : 'allow'
      }
    });
  }

  /**
   * Filter active policies based on version and state
   * 
   * @private
   */
  _filterActivePolicies(allPolicies) {
    return allPolicies.filter(policy => {
      // Must be enabled
      if (!policy.enabled) return false;
      
      // Check if policy is in draft state and draft policies should be ignored
      if (policy.state === 'draft' && !this._shouldIncludeDraftPolicies()) {
        return false;
      }
      
      // Only include published policies by default
      if (policy.state && policy.state !== 'published' && policy.state !== 'draft') {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Detect conflicts between policies that would apply to the same plan
   * 
   * @private
   */
  _detectPolicyConflicts(matchedPolicies, plan) {
    if (matchedPolicies.length <= 1) {
      return { has_conflicts: false };
    }

    const conflicts = [];
    
    // Group policies by their decision type
    const decisionGroups = {};
    matchedPolicies.forEach(policy => {
      const decision = policy.decision || 'allow';
      if (!decisionGroups[decision]) {
        decisionGroups[decision] = [];
      }
      decisionGroups[decision].push(policy);
    });

    // Detect allow vs deny conflicts
    if (decisionGroups.allow && decisionGroups.deny) {
      conflicts.push({
        type: 'allow_deny_conflict',
        message: 'Conflicting allow and deny policies found for same plan',
        allow_policies: decisionGroups.allow.map(p => p.policy_id),
        deny_policies: decisionGroups.deny.map(p => p.policy_id)
      });
    }

    // Detect requirement conflicts (different verification strengths, etc.)
    const requirementConflicts = this._detectRequirementConflicts(matchedPolicies);
    conflicts.push(...requirementConflicts);

    return {
      has_conflicts: conflicts.length > 0,
      conflicts: conflicts
    };
  }

  /**
   * Detect conflicts in policy requirements
   * 
   * @private
   */
  _detectRequirementConflicts(policies) {
    const conflicts = [];
    const verificationStrengths = new Set();
    
    policies.forEach(policy => {
      if (policy.requirements?.required_verification_strength) {
        verificationStrengths.add(policy.requirements.required_verification_strength);
      }
    });

    // If multiple different verification strengths are required, flag as potential conflict
    if (verificationStrengths.size > 1) {
      conflicts.push({
        type: 'verification_strength_conflict',
        message: 'Multiple policies require different verification strengths',
        required_strengths: Array.from(verificationStrengths)
      });
    }

    return conflicts;
  }

  /**
   * Generate cache key for policy evaluation
   * 
   * @private
   */
  _generateCacheKey(plan, context) {
    const cacheInputs = {
      objective: plan.objective,
      environment: plan.environment,
      risk_tier: plan.risk_tier,
      actor_type: context.actor?.type,
      trading_window: context.runtime_context?.trading_window_active,
      // Include relevant plan step summaries but not full details
      step_count: plan.steps?.length || 0,
      step_types: plan.steps?.map(s => s.type).sort() || []
    };

    // Create deterministic hash of inputs
    const inputStr = JSON.stringify(cacheInputs, Object.keys(cacheInputs).sort());
    return `policy_eval_${this._simpleHash(inputStr)}`;
  }

  /**
   * Get cached evaluation result
   * 
   * @private
   */
  _getCachedEvaluation(cacheKey) {
    const cached = this.evaluationCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.evaluationCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cached evaluation result
   * 
   * @private
   */
  _setCachedEvaluation(cacheKey, result, ttlMs) {
    // Prevent cache from growing too large
    if (this.evaluationCache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.evaluationCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 200).forEach(([key]) => {
        this.evaluationCache.delete(key);
      });
    }

    this.evaluationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Audit policy evaluation
   * 
   * @private
   */
  _auditPolicyEvaluation(auditData) {
    if (!this.auditLogger) return;

    try {
      this.auditLogger.logPolicyEvaluation({
        timestamp: Date.now(),
        event_type: 'policy_evaluation',
        ...auditData
      });
    } catch (error) {
      console.error('[PolicyEngine] Failed to write audit log:', error);
    }
  }

  /**
   * Check if draft policies should be included in evaluation
   * 
   * @private
   */
  _shouldIncludeDraftPolicies() {
    // Could be environment-based or configuration-driven
    return process.env.VIENNA_INCLUDE_DRAFT_POLICIES === 'true';
  }

  /**
   * Simple hash function for cache keys
   * 
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear evaluation cache (for testing or emergency)
   */
  clearCache() {
    this.evaluationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const [, cached] of this.evaluationCache) {
      if (now > cached.timestamp + cached.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total_entries: this.evaluationCache.size,
      valid_entries: valid,
      expired_entries: expired,
      cache_hit_potential: valid / Math.max(1, this.evaluationCache.size)
    };
  }
}

module.exports = PolicyEngine;
