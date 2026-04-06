/**
 * Policy Engine Types — Vienna OS
 * 
 * Type definitions for the policy evaluation system.
 * Core Invariant: All execution admissibility decisions must be made by
 * the Policy Engine before warrant issuance.
 */

import { RiskTierLevel } from '../governance/risk-tier';

// ─── Decision Types ───

export type PolicyDecisionType =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'require_stronger_verification'
  | 'require_precondition_check'
  | 'defer_to_operator';

export type VerificationStrength = 'none' | 'basic' | 'standard' | 'enhanced' | 'full';

// ─── Policy Structure ───

export interface PolicyScope {
  objective?: string | string[];
  environment?: string | string[];
  risk_tier?: RiskTierLevel | RiskTierLevel[];
  target_id?: string | string[];
  actor_type?: string | string[];
}

export interface PolicyConditions {
  actor_type?: string[];
  required_verification_strength?: VerificationStrength;
  trading_window_active?: boolean;
  custom?: Record<string, unknown>;
}

export interface LedgerConstraints {
  max_executions_per_hour?: number;
  max_executions_per_day?: number;
  max_failures_before_block?: number;
  lookback_window?: string;
  must_not_have_status?: string;
}

export interface PolicyRequirements {
  approval_required?: boolean;
  approval_tier?: RiskTierLevel;
  approval_ttl_seconds?: number;
  required_verification_strength?: VerificationStrength;
  required_preconditions?: string[];
  allowed_actor_types?: string[];
}

export interface Policy {
  policy_id: string;
  policy_version?: string | number;
  scope: PolicyScope;
  conditions?: PolicyConditions;
  ledger_constraints?: LedgerConstraints;
  requirements: PolicyRequirements;
  decision: PolicyDecisionType;
  priority: number;
  enabled: boolean;
  state?: 'draft' | 'published' | 'archived';
  description?: string;
  cache_ttl_ms?: number;
  created_at?: number;
  updated_at?: number;
}

// ─── Plan Structure ───

export interface PlanStep {
  type: string;
  action?: string;
  target?: string;
  [key: string]: unknown;
}

export interface Plan {
  plan_id: string;
  objective: string;
  environment?: string;
  risk_tier?: RiskTierLevel;
  tenant_id?: string;
  steps: PlanStep[];
  verification_spec?: {
    strength?: VerificationStrength;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ─── Evaluation Context ───

export interface EvaluationContext {
  actor?: {
    type: string;
    id?: string;
    [key: string]: unknown;
  };
  runtime_context?: {
    trading_window_active?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface EvaluationOptions {
  skipCache?: boolean;
}

// ─── Policy Decision Output ───

export interface ConflictResolution {
  num_policies_matched: number;
  matched_policy_ids: string[];
  resolution_strategy: 'deny_wins' | 'highest_priority';
  explanation: string;
}

export interface PolicyEvaluatedContext {
  plan_summary: {
    plan_id: string;
    objective: string;
    environment?: string;
    risk_tier?: RiskTierLevel;
    num_steps?: number;
  };
  ledger_query_results?: Record<string, unknown>;
  runtime_context?: Record<string, unknown>;
  evaluation_time_ms: number;
  default_policy_decision?: string;
}

export interface PolicyDecision {
  decision_id: string;
  plan_id: string;
  policy_id: string | null;
  policy_version: string | number | null;
  decision: PolicyDecisionType;
  reasons: string[];
  requirements: PolicyRequirements;
  evaluated_context: PolicyEvaluatedContext;
  conflict_resolution?: ConflictResolution;
  timestamp: number;
}

// ─── Policy Evaluation Detail (for audit) ───

export interface PolicyEvaluationDetail {
  policy_id: string;
  policy_version?: string | number;
  matched: boolean;
  conditions_met: boolean;
  decision: PolicyDecisionType | null;
}

export interface PolicyConflictDetection {
  has_conflicts: boolean;
  conflicts?: Array<{
    type: string;
    message: string;
    allow_policies?: string[];
    deny_policies?: string[];
    required_strengths?: string[];
  }>;
}

export interface PolicyEvaluationAudit {
  evaluation_id: string;
  plan_id: string;
  cache_hit?: boolean;
  cache_key?: string;
  matched_policies?: Array<{ policy_id: string; version?: string | number }>;
  evaluated_policies?: Array<{ policy_id: string; version?: string | number }>;
  final_policy?: { policy_id: string; version?: string | number } | null;
  decision: PolicyDecisionType;
  policy_details?: PolicyEvaluationDetail[];
  conflicts_detected?: PolicyConflictDetection;
  conflict_resolution?: ConflictResolution;
  evaluation_time_ms: number;
}

// ─── Cache ───

export interface CacheEntry<T> {
  result: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  total_entries: number;
  valid_entries: number;
  expired_entries: number;
  cache_hit_potential: number;
}

// ─── State Graph Interface (minimal contract) ───

export interface StateGraphLike {
  listExecutionLedgerSummaries(filters: {
    objective?: string;
    started_after?: number;
    limit?: number;
  }): Promise<ExecutionLedgerSummary[]>;
  getTenant?(tenantId: string): { default_policy_decision?: string } | null;
}

export interface ExecutionLedgerSummary {
  execution_id: string;
  execution_status: string;
  status?: string;
  started_at: number;
  [key: string]: unknown;
}

// ─── Audit Logger Interface ───

export interface AuditLogger {
  logPolicyEvaluation(data: {
    timestamp: number;
    event_type: string;
    [key: string]: unknown;
  }): void;
}

// ─── Policy Engine Constructor Options ───

export interface PolicyEngineOptions {
  stateGraph: StateGraphLike;
  loadPolicies: () => Promise<Policy[]>;
  auditLogger?: AuditLogger | null;
}
