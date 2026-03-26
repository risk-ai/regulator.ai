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
  return apiClient.get<PolicyRule[]>('/policies', params as Record<string, string | boolean>);
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
