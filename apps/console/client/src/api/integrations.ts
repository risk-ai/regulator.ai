/**
 * Integrations API Client — Vienna OS
 */

import { apiClient } from './client';

export interface Integration {
  id: string;
  type: string;
  name: string;
  description: string | null;
  config: Record<string, any>;
  event_types: string[];
  filters: Record<string, any>;
  enabled: boolean;
  last_success: string | null;
  last_failure: string | null;
  last_error: string | null;
  consecutive_failures: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  event_count?: number;
  success_count?: number;
}

export interface IntegrationStats {
  total_events: number;
  success_count: number;
  failure_count: number;
  avg_latency_ms: number;
}

export interface IntegrationEvent {
  id: string;
  integration_id: string;
  event_type: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ConfigSchema {
  type: string;
  label: string;
  description: string;
  icon: string;
  fields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'number' | 'select' | 'multi-text';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

// ── API Functions ──────────────────────────────

export async function listIntegrations(): Promise<Integration[]> {
  return apiClient.get<Integration[]>('/integrations');
}

export async function getIntegration(id: string): Promise<Integration & { stats: IntegrationStats }> {
  return apiClient.get<Integration & { stats: IntegrationStats }>(`/integrations/${id}`);
}

export async function createIntegration(data: {
  type: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  event_types?: string[];
  filters?: Record<string, any>;
}): Promise<Integration> {
  return apiClient.post<Integration>('/integrations', data);
}

export async function updateIntegration(id: string, data: Partial<{
  name: string;
  description: string;
  config: Record<string, any>;
  event_types: string[];
  filters: Record<string, any>;
  enabled: boolean;
}>): Promise<Integration> {
  return apiClient.put<Integration>(`/integrations/${id}`, data);
}

export async function deleteIntegration(id: string): Promise<void> {
  await apiClient.delete(`/integrations/${id}`);
}

export async function testIntegration(id: string): Promise<TestResult> {
  return apiClient.post<TestResult>(`/integrations/${id}/test`, {});
}

export async function toggleIntegration(id: string): Promise<Integration> {
  return apiClient.post<Integration>(`/integrations/${id}/toggle`, {});
}

export async function getIntegrationEvents(id: string, limit = 50, offset = 0): Promise<{ data: IntegrationEvent[]; total: number }> {
  // We need the raw response here to get total
  const result = await apiClient.fetch<{ data: IntegrationEvent[]; total: number }>(`/integrations/${id}/events?limit=${limit}&offset=${offset}`);
  // apiClient.fetch extracts from success.data, but our endpoint wraps data inside data
  // Actually the route returns { success, data: events[], total } so apiClient extracts data = events[]
  // We need to handle this differently
  return result as any;
}

export async function getIntegrationTypes(): Promise<ConfigSchema[]> {
  return apiClient.get<ConfigSchema[]>('/integrations/types');
}
