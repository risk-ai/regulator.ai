/**
 * Policy Builder API Client — Vienna OS
 */

import { apiClient } from './client.js';

// ============================================================================
// Types
// ============================================================================

export interface PolicyCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string | null;
  conditions: PolicyCondition[];
  action_on_match: string;
  approval_tier: string | null;
  required_approvers: string[];
  priority: number;
  enabled: boolean;
  tenant_scope: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  last_triggered?: string | null;
  recent_evaluations?: PolicyEvaluation[];
}

export interface PolicyEvaluation {
  id: string;
  rule_id: string;
  rule_name?: string;
  intent_id: string | null;
  agent_id: string | null;
  action_type: string | null;
  conditions_checked: unknown;
  result: string;
  action_taken: string | null;
  context_snapshot: unknown;
  evaluated_at: string;
}

export interface ConditionDetail {
  field: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface EvaluationResult {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  action: string;
  approval_tier?: string;
  required_approvers?: string[];
  conditions_detail: ConditionDetail[];
}

export interface FullEvaluationResult {
  matched_rule: EvaluationResult | null;
  all_results: EvaluationResult[];
  default_action: string;
  evaluated_at: string;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  rules: Array<{
    name: string;
    conditions: PolicyCondition[];
    action_on_match: string;
    approval_tier?: string;
    required_approvers?: string[];
    priority: number;
    tenant_scope: string;
  }>;
}

export interface CreatePolicyPayload {
  name: string;
  description?: string;
  conditions: PolicyCondition[];
  action_on_match?: string;
  approval_tier?: string;
  required_approvers?: string[];
  priority?: number;
  enabled?: boolean;
  tenant_scope?: string;
}

// ============================================================================
// API Methods
// ============================================================================

export async function listPolicies(params?: {
  enabled?: boolean;
  search?: string;
  action?: string;
}): Promise<PolicyRule[]> {
  const response = await apiClient.get<{ policies: PolicyRule[]; total: number }>('/policies', params as Record<string, string | boolean>);
  return response.policies;
}

export async function getPolicy(id: string): Promise<PolicyRule> {
  return apiClient.get<PolicyRule>(`/policies/${id}`);
}

export async function createPolicy(payload: CreatePolicyPayload): Promise<PolicyRule> {
  return apiClient.post<PolicyRule>('/policies', payload);
}

export async function updatePolicy(id: string, payload: Partial<CreatePolicyPayload>): Promise<PolicyRule> {
  return apiClient.put<PolicyRule>(`/policies/${id}`, payload);
}

export async function deletePolicy(id: string): Promise<{ id: string; disabled: boolean }> {
  return apiClient.delete<{ id: string; disabled: boolean }>(`/policies/${id}`);
}

export async function togglePolicy(id: string): Promise<PolicyRule> {
  return apiClient.post<PolicyRule>(`/policies/${id}/toggle`, {});
}

export async function duplicatePolicy(id: string): Promise<PolicyRule> {
  return apiClient.post<PolicyRule>(`/policies/${id}/duplicate`, {});
}

export async function evaluatePolicy(
  context: Record<string, unknown>,
  defaultAction?: string
): Promise<FullEvaluationResult> {
  return apiClient.post<FullEvaluationResult>('/policies/evaluate', {
    context,
    default_action: defaultAction,
  });
}

export async function reorderPolicies(
  rules: { id: string; priority: number }[]
): Promise<{ updated: number }> {
  return apiClient.post<{ updated: number }>('/policies/reorder', { rules });
}

export async function listEvaluations(params?: {
  rule_id?: string;
  result?: string;
  limit?: number;
  offset?: number;
}): Promise<PolicyEvaluation[]> {
  return apiClient.get<PolicyEvaluation[]>('/policies/evaluations', params as Record<string, string | number>);
}

export async function getTemplates(): Promise<PolicyTemplate[]> {
  return apiClient.get<PolicyTemplate[]>('/policies/templates');
}

// P1: Policy versioning
export interface PolicyVersion {
  version: number;
  name: string;
  conditions: PolicyCondition[];
  action_on_match: string;
  approval_tier: string | null;
  enabled: boolean;
  updated_at: string;
  updated_by: string;
}

export async function getPolicyVersions(id: string): Promise<PolicyVersion[]> {
  return apiClient.get<PolicyVersion[]>(`/policies/${id}/versions`).catch(() => {
    // Fallback: if endpoint doesn't exist yet, return current as only version
    return [];
  });
}

export async function revertPolicy(id: string, version: number): Promise<PolicyRule> {
  return apiClient.post<PolicyRule>(`/policies/${id}/revert`, { version });
}

// ============================================================
// Premium Policy Builder APIs (Phase 6)
// ============================================================

export interface CoverageData {
  total_action_types: number;
  covered_count: number;
  coverage_percentage: number;
  coverage: Record<string, { policyCount: number; policies: string[] }>;
  uncovered: string[];
}

export async function getPolicyCoverage(): Promise<CoverageData> {
  const res = await apiClient.get<{ success: boolean; data: CoverageData }>('/policies/coverage');
  return (res as any).data || res;
}

export interface ConflictItem {
  policy_a: { id: string; name: string; action: string; priority: number };
  policy_b: { id: string; name: string; action: string; priority: number };
  overlap_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ConflictsData {
  total_conflicts: number;
  high: number;
  medium: number;
  low: number;
  conflicts: ConflictItem[];
}

export async function getPolicyConflicts(): Promise<ConflictsData> {
  const res = await apiClient.get<{ success: boolean; data: ConflictsData }>('/policies/conflicts');
  return (res as any).data || res;
}

export interface EffectivenessItem {
  policy_id: string;
  policy_name: string;
  total_evaluations: number;
  allows: number;
  denials: number;
  approvals_required: number;
  deferred: number;
  denial_rate: number;
  first_evaluation: string;
  last_evaluation: string;
}

export interface EffectivenessData {
  period_days: number;
  policies_evaluated: number;
  never_triggered: Array<{ id: string; name: string }>;
  effectiveness: EffectivenessItem[];
}

export async function getPolicyEffectiveness(days?: number): Promise<EffectivenessData> {
  const params = days ? { days } : {};
  const res = await apiClient.get<{ success: boolean; data: EffectivenessData }>('/policies/effectiveness', params as any);
  return (res as any).data || res;
}

export async function bulkPolicyAction(action: 'enable' | 'disable' | 'delete', policyIds: string[]): Promise<{ action: string; requested: number; affected: number }> {
  const res = await apiClient.post<{ success: boolean; data: any }>('/policies/bulk', { action, policy_ids: policyIds });
  return (res as any).data || res;
}
