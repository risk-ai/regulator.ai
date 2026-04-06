/**
 * Policy Engine — Vienna OS
 * 
 * Single canonical policy evaluation layer.
 * All execution admissibility decisions happen here.
 * 
 * Core Invariant:
 * All execution admissibility decisions must be made by the Policy Engine
 * before warrant issuance.
 * 
 * Flow:
 * Intent → Plan → PolicyEngine.evaluate() → PolicyDecision → Warrant → Execution
 */

import {
  type Policy,
  type Plan,
  type PolicyDecision,
  type PolicyDecisionType,
  type EvaluationContext,
  type EvaluationOptions,
  type PolicyEngineOptions,
  type PolicyEvaluationDetail,
  type PolicyConflictDetection,
  type ConflictResolution,
  type PolicyEvaluatedContext,
  type PolicyRequirements,
  type CacheEntry,
  type CacheStats,
  type AuditLogger,
  type StateGraphLike,
  type ExecutionLedgerSummary,
  type VerificationStrength,
} from './policy-engine.types.js';

// Re-import schema constants from JS (bridge until those are also TS)
const policySchemaModule = require('./policy-schema');
const policyDecisionSchemaModule = require('./policy-decision-schema');

const { DECISION_TYPES, VERIFICATION_STRENGTH, policyMatchesPlan } = policySchemaModule;
const { createPolicyDecision, mergeRequirements } = policyDecisionSchemaModule;

export class PolicyEngine {
  private stateGraph: StateGraphLike;
  private loadPolicies: () => Promise<Policy[]>;
  private auditLogger: AuditLogger | null;
  private evaluationCache: Map<string, CacheEntry<PolicyDecision>>;
  private defaultCacheTtlMs: number;
  private policyVersions: Map<string, number>;
  private publishedPolicies: Set<string>;

  constructor({ stateGraph, loadPolicies, auditLogger = null }: PolicyEngineOptions) {
    this.stateGraph = stateGraph;
    this.loadPolicies = loadPolicies;
    this.auditLogger = auditLogger;
    this.evaluationCache = new Map();
    this.defaultCacheTtlMs = 5 * 60 * 1000; // 5 minutes
    this.policyVersions = new Map();
    this.publishedPolicies = new Set();
  }

  /**
   * Evaluate a plan against all applicable policies.
   * This is the single entry point for all authorization decisions.
   */
  async evaluate(
    plan: Plan,
    context: EvaluationContext = {},
    options: EvaluationOptions = {}
  ): Promise<PolicyDecision> {
    const startTime = Date.now();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check cache first
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
          evaluation_time_ms: Date.now() - startTime,
        });
        return cached;
      }
    }

    // Load and filter active policies
    const allPolicies = await this.loadPolicies();
    const activePolicies = this._filterActivePolicies(allPolicies);

    // Find matching policies
    const matchedPolicies = activePolicies.filter((policy) =>
      policyMatchesPlan(policy, plan)
    );

    // Detect conflicts early
    const conflictDetection = this._detectPolicyConflicts(matchedPolicies, plan);

    // No policies match → use tenant default
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
        evaluation_time_ms: Date.now() - startTime,
      });
      return decision;
    }

    // Evaluate conditions for each matched policy
    const evaluatedPolicies: Policy[] = [];
    const ledgerQueryResults: Record<string, unknown> = {};
    const policyEvaluationDetails: PolicyEvaluationDetail[] = [];

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
        decision: conditionsMet ? (policy.decision as PolicyDecisionType) : null,
      });

      if (conditionsMet) {
        evaluatedPolicies.push(policy);
      }
    }

    // No policies passed conditions → use tenant default
    if (evaluatedPolicies.length === 0) {
      const decision = this._createNoMatchDecision(plan, startTime);
      this._auditPolicyEvaluation({
        evaluation_id: evaluationId,
        plan_id: plan.plan_id,
        matched_policies: matchedPolicies.map((p) => ({
          policy_id: p.policy_id,
          version: p.policy_version || 1,
        })),
        evaluated_policies: [],
        final_policy: null,
        decision: decision.decision,
        policy_details: policyEvaluationDetails,
        conflicts_detected: conflictDetection,
        evaluation_time_ms: Date.now() - startTime,
      });
      return decision;
    }

    // Resolve conflicts
    const finalPolicy = this._resolveConflicts(evaluatedPolicies);
    const conflictResolution: ConflictResolution | undefined =
      evaluatedPolicies.length > 1
        ? {
            num_policies_matched: evaluatedPolicies.length,
            matched_policy_ids: evaluatedPolicies.map((p) => p.policy_id),
            resolution_strategy: this._getResolutionStrategy(evaluatedPolicies, finalPolicy),
            explanation: `${evaluatedPolicies.length} policies matched, selected policy_id=${finalPolicy.policy_id} by ${this._getResolutionStrategy(evaluatedPolicies, finalPolicy)}`,
          }
        : undefined;

    // Build final decision
    const decision = this._buildDecision(
      finalPolicy,
      plan,
      context,
      ledgerQueryResults,
      conflictResolution,
      startTime
    );

    // Cache result
    if (!options.skipCache) {
      const cacheKey = this._generateCacheKey(plan, context);
      const cacheTtl = finalPolicy.cache_ttl_ms || this.defaultCacheTtlMs;
      this._setCachedEvaluation(cacheKey, decision, cacheTtl);
    }

    // Audit
    this._auditPolicyEvaluation({
      evaluation_id: evaluationId,
      plan_id: plan.plan_id,
      matched_policies: matchedPolicies.map((p) => ({
        policy_id: p.policy_id,
        version: p.policy_version || 1,
      })),
      evaluated_policies: evaluatedPolicies.map((p) => ({
        policy_id: p.policy_id,
        version: p.policy_version || 1,
      })),
      final_policy: {
        policy_id: finalPolicy.policy_id,
        version: finalPolicy.policy_version || 1,
      },
      decision: decision.decision,
      policy_details: policyEvaluationDetails,
      conflicts_detected: conflictDetection,
      conflict_resolution: conflictResolution,
      evaluation_time_ms: Date.now() - startTime,
    });

    return decision;
  }

  // ─── Condition Evaluation ───

  private async _evaluateConditions(
    policy: Policy,
    plan: Plan,
    context: EvaluationContext,
    ledgerQueryResults: Record<string, unknown>
  ): Promise<boolean> {
    const conditions = policy.conditions || {};

    // Actor type check
    if (conditions.actor_type && context.actor) {
      if (!conditions.actor_type.includes(context.actor.type)) {
        return false;
      }
    }

    // Verification strength check
    if (conditions.required_verification_strength) {
      const planStrength = (plan.verification_spec?.strength as string) || 'none';
      const requiredStrength = conditions.required_verification_strength as string;
      const strengths = Object.values(VERIFICATION_STRENGTH) as string[];
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
    if (
      policy.ledger_constraints &&
      Object.keys(policy.ledger_constraints).length > 0
    ) {
      const constraintsViolated = await this._evaluateLedgerConstraints(
        policy.ledger_constraints,
        plan,
        ledgerQueryResults
      );
      if (!constraintsViolated) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate ledger constraints (trigger conditions for the policy).
   * Returns TRUE when constraint is VIOLATED (policy should apply).
   * Returns FALSE when constraint is SATISFIED (no trigger).
   */
  private async _evaluateLedgerConstraints(
    constraints: NonNullable<Policy['ledger_constraints']>,
    plan: Plan,
    ledgerQueryResults: Record<string, unknown>
  ): Promise<boolean> {
    const { objective } = plan;
    const lookbackWindow = constraints.lookback_window || '1h';
    const lookbackMs = this._parseLookbackWindow(lookbackWindow);
    const lookbackTime = Date.now() - lookbackMs;

    // Max executions per hour/day
    if (constraints.max_executions_per_hour || constraints.max_executions_per_day) {
      const cacheKey = `executions_${objective}_${lookbackWindow}`;

      if (!ledgerQueryResults[cacheKey]) {
        ledgerQueryResults[cacheKey] =
          await this.stateGraph.listExecutionLedgerSummaries({
            objective,
            started_after: lookbackTime,
          });
      }

      const executions = ledgerQueryResults[cacheKey] as ExecutionLedgerSummary[];

      if (constraints.max_executions_per_hour) {
        const hourAgo = Date.now() - 60 * 60 * 1000;
        const count = executions.filter((e) => e.started_at >= hourAgo).length;
        if (count >= constraints.max_executions_per_hour) return true;
      }

      if (constraints.max_executions_per_day) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const count = executions.filter((e) => e.started_at >= dayAgo).length;
        if (count >= constraints.max_executions_per_day) return true;
      }
    }

    // Consecutive failures
    if (constraints.max_failures_before_block) {
      const cacheKey = `recent_${objective}`;
      if (!ledgerQueryResults[cacheKey]) {
        ledgerQueryResults[cacheKey] =
          await this.stateGraph.listExecutionLedgerSummaries({
            objective,
            limit: constraints.max_failures_before_block,
          });
      }
      const recent = ledgerQueryResults[cacheKey] as ExecutionLedgerSummary[];
      const allFailed =
        recent.length >= constraints.max_failures_before_block &&
        recent.every((e) => e.execution_status === 'failed');
      if (allFailed) return true;
    }

    // Last execution status
    if (constraints.must_not_have_status) {
      const cacheKey = `last_${objective}`;
      if (!ledgerQueryResults[cacheKey]) {
        const results = await this.stateGraph.listExecutionLedgerSummaries({
          objective,
          limit: 1,
        });
        ledgerQueryResults[cacheKey] = results[0] || null;
      }
      const last = ledgerQueryResults[cacheKey] as ExecutionLedgerSummary | null;
      if (last && last.execution_status === constraints.must_not_have_status) {
        return true;
      }
    }

    return false;
  }

  // ─── Conflict Resolution ───

  /**
   * Deterministic conflict resolution:
   * 1. Deny beats allow
   * 2. Highest priority wins
   */
  private _resolveConflicts(policies: Policy[]): Policy {
    if (policies.length === 1) return policies[0];

    const denyPolicies = policies.filter((p) => p.decision === DECISION_TYPES.DENY);
    if (denyPolicies.length > 0) {
      return denyPolicies.reduce((highest, current) =>
        current.priority > highest.priority ? current : highest
      );
    }

    return policies.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );
  }

  private _getResolutionStrategy(
    policies: Policy[],
    selected: Policy
  ): 'deny_wins' | 'highest_priority' {
    const hasDeny = policies.some((p) => p.decision === DECISION_TYPES.DENY);
    return hasDeny && selected.decision === DECISION_TYPES.DENY
      ? 'deny_wins'
      : 'highest_priority';
  }

  // ─── Decision Building ───

  private _buildDecision(
    policy: Policy,
    plan: Plan,
    context: EvaluationContext,
    ledgerQueryResults: Record<string, unknown>,
    conflictResolution: ConflictResolution | undefined,
    startTime: number
  ): PolicyDecision {
    const reasons = this._buildReasons(policy, plan, context, ledgerQueryResults);
    const requirements: PolicyRequirements = { ...policy.requirements };

    const evaluated_context: PolicyEvaluatedContext = {
      plan_summary: {
        plan_id: plan.plan_id,
        objective: plan.objective,
        environment: plan.environment,
        risk_tier: plan.risk_tier,
        num_steps: plan.steps.length,
      },
      ledger_query_results: this._sanitizeLedgerResults(ledgerQueryResults),
      runtime_context: (context.runtime_context as Record<string, unknown>) || {},
      evaluation_time_ms: Date.now() - startTime,
    };

    return createPolicyDecision({
      plan_id: plan.plan_id,
      policy_id: policy.policy_id,
      policy_version: policy.policy_version,
      decision: policy.decision,
      reasons,
      requirements,
      evaluated_context,
      conflict_resolution: conflictResolution,
    });
  }

  private _buildReasons(
    policy: Policy,
    plan: Plan,
    context: EvaluationContext,
    ledgerQueryResults: Record<string, unknown>
  ): string[] {
    const reasons: string[] = [];
    reasons.push(`Policy ${policy.policy_id} matched for objective=${plan.objective}`);
    if (plan.environment) reasons.push(`Environment: ${plan.environment}`);
    if (plan.risk_tier) reasons.push(`Risk tier: ${plan.risk_tier}`);
    if (context.actor) reasons.push(`Actor type: ${context.actor.type}`);

    for (const [key, value] of Object.entries(ledgerQueryResults)) {
      if (Array.isArray(value)) {
        reasons.push(`Recent executions (${key}): ${value.length}`);
      }
    }

    if (policy.requirements.approval_required) {
      reasons.push('Approval required by policy');
    }
    if (policy.requirements.required_verification_strength) {
      reasons.push(`Verification strength required: ${policy.requirements.required_verification_strength}`);
    }

    return reasons;
  }

  /**
   * No-match decision: respects tenant-level default_policy_decision.
   * New tenants default to DENY (secure posture).
   */
  private _createNoMatchDecision(plan: Plan, startTime: number): PolicyDecision {
    let defaultDecision: string = DECISION_TYPES.ALLOW;
    let defaultReason = 'No matching policy found, defaulting to allow (legacy)';

    if (plan.tenant_id && this.stateGraph) {
      try {
        const tenant =
          typeof this.stateGraph.getTenant === 'function'
            ? this.stateGraph.getTenant(plan.tenant_id)
            : null;
        if (tenant && tenant.default_policy_decision === 'deny') {
          defaultDecision = DECISION_TYPES.DENY;
          defaultReason = 'No matching policy found, tenant default is deny';
        } else if (!tenant) {
          defaultDecision = DECISION_TYPES.DENY;
          defaultReason = 'No matching policy found, unknown tenant defaults to deny';
        }
      } catch {
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
        approval_required: defaultDecision === DECISION_TYPES.DENY,
      },
      evaluated_context: {
        plan_summary: {
          plan_id: plan.plan_id,
          objective: plan.objective,
          environment: plan.environment,
          risk_tier: plan.risk_tier,
        },
        evaluation_time_ms: Date.now() - startTime,
        default_policy_decision: defaultDecision === DECISION_TYPES.DENY ? 'deny' : 'allow',
      },
    });
  }

  // ─── Policy Filtering ───

  private _filterActivePolicies(allPolicies: Policy[]): Policy[] {
    return allPolicies.filter((policy) => {
      if (!policy.enabled) return false;
      if (policy.state === 'draft' && !this._shouldIncludeDraftPolicies()) return false;
      if (policy.state && policy.state !== 'published' && policy.state !== 'draft') return false;
      return true;
    });
  }

  // ─── Conflict Detection ───

  private _detectPolicyConflicts(
    matchedPolicies: Policy[],
    _plan: Plan
  ): PolicyConflictDetection {
    if (matchedPolicies.length <= 1) {
      return { has_conflicts: false };
    }

    const conflicts: PolicyConflictDetection['conflicts'] = [];

    const decisionGroups: Record<string, Policy[]> = {};
    matchedPolicies.forEach((policy) => {
      const decision = policy.decision || 'allow';
      if (!decisionGroups[decision]) decisionGroups[decision] = [];
      decisionGroups[decision].push(policy);
    });

    if (decisionGroups.allow && decisionGroups.deny) {
      conflicts!.push({
        type: 'allow_deny_conflict',
        message: 'Conflicting allow and deny policies found for same plan',
        allow_policies: decisionGroups.allow.map((p) => p.policy_id),
        deny_policies: decisionGroups.deny.map((p) => p.policy_id),
      });
    }

    const requirementConflicts = this._detectRequirementConflicts(matchedPolicies);
    conflicts!.push(...requirementConflicts);

    return {
      has_conflicts: conflicts!.length > 0,
      conflicts,
    };
  }

  private _detectRequirementConflicts(
    policies: Policy[]
  ): NonNullable<PolicyConflictDetection['conflicts']> {
    const conflicts: NonNullable<PolicyConflictDetection['conflicts']> = [];
    const verificationStrengths = new Set<string>();

    policies.forEach((policy) => {
      if (policy.requirements?.required_verification_strength) {
        verificationStrengths.add(policy.requirements.required_verification_strength);
      }
    });

    if (verificationStrengths.size > 1) {
      conflicts.push({
        type: 'verification_strength_conflict',
        message: 'Multiple policies require different verification strengths',
        required_strengths: Array.from(verificationStrengths),
      });
    }

    return conflicts;
  }

  // ─── Caching ───

  private _generateCacheKey(plan: Plan, context: EvaluationContext): string {
    const cacheInputs = {
      objective: plan.objective,
      environment: plan.environment,
      risk_tier: plan.risk_tier,
      actor_type: context.actor?.type,
      trading_window: context.runtime_context?.trading_window_active,
      step_count: plan.steps?.length || 0,
      step_types: plan.steps?.map((s) => s.type).sort() || [],
    };
    const inputStr = JSON.stringify(cacheInputs, Object.keys(cacheInputs).sort());
    return `policy_eval_${this._simpleHash(inputStr)}`;
  }

  private _getCachedEvaluation(cacheKey: string): PolicyDecision | null {
    const cached = this.evaluationCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.evaluationCache.delete(cacheKey);
      return null;
    }
    return cached.result;
  }

  private _setCachedEvaluation(cacheKey: string, result: PolicyDecision, ttlMs: number): void {
    if (this.evaluationCache.size > 1000) {
      const entries = Array.from(this.evaluationCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 200).forEach(([key]) => this.evaluationCache.delete(key));
    }
    this.evaluationCache.set(cacheKey, { result, timestamp: Date.now(), ttl: ttlMs });
  }

  /** Clear evaluation cache */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /** Get cache statistics */
  getCacheStats(): CacheStats {
    const now = Date.now();
    let expired = 0;
    let valid = 0;
    for (const [, cached] of this.evaluationCache) {
      if (now > cached.timestamp + cached.ttl) expired++;
      else valid++;
    }
    return {
      total_entries: this.evaluationCache.size,
      valid_entries: valid,
      expired_entries: expired,
      cache_hit_potential: valid / Math.max(1, this.evaluationCache.size),
    };
  }

  // ─── Utilities ───

  private _parseLookbackWindow(window: string): number {
    const match = window.match(/^(\d+)(m|h|d)$/);
    if (!match) return 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private _sanitizeLedgerResults(
    ledgerQueryResults: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ledgerQueryResults)) {
      if (Array.isArray(value)) {
        sanitized[key] = {
          count: value.length,
          sample: value.slice(0, 2).map((e: any) => ({
            execution_id: e.execution_id,
            status: e.status,
            started_at: e.started_at,
          })),
        };
      } else if (value && typeof value === 'object') {
        sanitized[key] = {
          execution_id: (value as any).execution_id,
          status: (value as any).status,
          started_at: (value as any).started_at,
        };
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private _auditPolicyEvaluation(auditData: Record<string, unknown>): void {
    if (!this.auditLogger) return;
    try {
      this.auditLogger.logPolicyEvaluation({
        timestamp: Date.now(),
        event_type: 'policy_evaluation',
        ...auditData,
      });
    } catch (error) {
      console.error('[PolicyEngine] Failed to write audit log:', error);
    }
  }

  private _shouldIncludeDraftPolicies(): boolean {
    return process.env.VIENNA_INCLUDE_DRAFT_POLICIES === 'true';
  }

  private _simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

export default PolicyEngine;
