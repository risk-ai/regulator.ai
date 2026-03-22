/**
 * Objectives API
 */

import { apiClient } from './client.js';
import type {
  ObjectiveSummary,
  ObjectiveDetail,
  EnvelopeExecution,
  WarrantSummary,
} from './types.js';

export const objectivesApi = {
  /**
   * List objectives
   */
  list: (params?: { status?: string; search?: string; limit?: number }) =>
    apiClient.get<ObjectiveSummary[]>('/objectives', params),

  /**
   * Get objective detail
   */
  get: (objectiveId: string) =>
    apiClient.get<ObjectiveDetail>(`/objectives/${objectiveId}`),

  /**
   * Get objective envelopes
   */
  getEnvelopes: (objectiveId: string) =>
    apiClient.get<{ objective_id: string; envelopes: EnvelopeExecution[]; total: number }>(
      `/objectives/${objectiveId}/envelopes`
    ),

  /**
   * Get causal chain
   */
  getCausalChain: (objectiveId: string) =>
    apiClient.get<{
      objective_id: string;
      root_envelope_id: string;
      nodes: Array<{
        envelope_id: string;
        action_type: string;
        target: string;
        state: string;
        depth: number;
        parent_id?: string;
        children: string[];
        executed_at?: string;
      }>;
      max_depth: number;
    }>(`/objectives/${objectiveId}/causal-chain`),

  /**
   * Get warrant
   */
  getWarrant: (objectiveId: string) =>
    apiClient.get<WarrantSummary>(`/objectives/${objectiveId}/warrant`),

  /**
   * Cancel objective
   */
  cancel: (objectiveId: string, operator: string, reason: string) =>
    apiClient.post<{ success: boolean; objective_id: string; cancelled_at: string; envelopes_cancelled: number }>(
      `/objectives/${objectiveId}/cancel`,
      { operator, reason }
    ),

  /**
   * Get objective timeline (Phase 5B)
   */
  getTimeline: (
    objectiveId: string,
    params?: {
      category?: 'execution' | 'objective' | 'alert' | 'system';
      status?: 'info' | 'running' | 'success' | 'warning' | 'error';
      limit?: number;
    }
  ) =>
    apiClient.get<{
      objectiveId: string;
      items: Array<{
        id: string;
        ts: string;
        objectiveId: string;
        envelopeId?: string;
        category: 'execution' | 'objective' | 'alert' | 'system';
        type: string;
        title: string;
        status: 'info' | 'running' | 'success' | 'warning' | 'error';
        message?: string;
        metadata?: Record<string, unknown>;
      }>;
      summary: {
        state: string;
        progressPct?: number;
        queued: number;
        executing: number;
        verified: number;
        failed: number;
        deadLettered: number;
      };
    }>(`/objectives/${objectiveId}/timeline`, params),
};
