/**
 * Action Types API Client
 * 
 * Custom Action Type Registry — CRUD + validation + usage stats
 */

import { apiClient } from './client.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActionType {
  id: string;
  action_type: string;
  display_name: string;
  description: string | null;
  category: string;
  payload_schema: Record<string, unknown>;
  default_risk_tier: string;
  is_builtin: boolean;
  icon: string;
  color: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

export interface ActionTypeWithStats extends ActionType {
  usage_count: number;
  usage_last_7_days: Array<{ day: string; count: number }>;
}

export interface ActionTypeUsageEntry {
  id: string;
  action_type_id: string;
  agent_id: string | null;
  intent_id: string | null;
  status: string;
  executed_at: string;
}

export interface CreateActionTypePayload {
  action_type?: string;
  display_name: string;
  description?: string;
  category?: string;
  payload_schema?: Record<string, unknown>;
  default_risk_tier?: string;
  icon?: string;
  color?: string;
}

export interface UpdateActionTypePayload {
  display_name?: string;
  description?: string;
  category?: string;
  payload_schema?: Record<string, unknown>;
  default_risk_tier?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
}

export interface CategoryInfo {
  category: string;
  count: number;
}

export interface ValidationResult {
  action_type: string;
  valid: boolean;
  errors: string[];
  schema: Record<string, unknown>;
}

export interface UsageResponse {
  usage: ActionTypeUsageEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const actionTypesApi = {
  /**
   * List all action types (filterable)
   */
  list: (params?: { category?: string; enabled?: boolean }) =>
    apiClient.get<ActionType[]>('/action-types', params as any),

  /**
   * Get single action type with usage stats
   */
  get: (id: string) =>
    apiClient.get<ActionTypeWithStats>(`/action-types/${id}`),

  /**
   * Create a custom action type
   */
  create: (payload: CreateActionTypePayload) =>
    apiClient.post<ActionType, CreateActionTypePayload>('/action-types', payload),

  /**
   * Update an action type
   */
  update: (id: string, payload: UpdateActionTypePayload) =>
    apiClient.put<ActionType, UpdateActionTypePayload>(`/action-types/${id}`, payload),

  /**
   * Delete a custom action type
   */
  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean; action_type: string }>(`/action-types/${id}`),

  /**
   * Get usage history for an action type
   */
  usage: (id: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<UsageResponse>(`/action-types/${id}/usage`, params as any),

  /**
   * Validate a payload against an action type's schema
   */
  validate: (action_type: string, payload: Record<string, unknown>) =>
    apiClient.post<ValidationResult, { action_type: string; payload: Record<string, unknown> }>(
      '/action-types/validate',
      { action_type, payload }
    ),

  /**
   * List all categories
   */
  categories: () =>
    apiClient.get<CategoryInfo[]>('/action-types/categories'),
};
