/**
 * Managed Objectives API Client
 * 
 * Phase 10: Client for autonomous objective management endpoints
 */

import { apiClient } from './client.js';

export interface ManagedObjective {
  objective_id: string;
  objective_type: string;
  target_type: string;
  target_id: string;
  priority: string;
  enabled: boolean;
  state: string;
  satisfied: boolean;
  desired_state: any;
  last_evaluated_at: string | null;
  last_transition_at: string | null;
  consecutive_failures: number;
  reconciliation_status: string;
  reconciliation_generation: number | null;
  reconciliation_attempt_count: number;
  reconciliation_started_at: string | null;
  cooldown_until: string | null;
  last_failure_reason: string | null;
  state_metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ManagedObjectivesResponse {
  objectives: ManagedObjective[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export const managedObjectivesApi = {
  /**
   * Get list of managed objectives
   */
  async getManagedObjectives(params?: {
    status?: string;
    target_type?: string;
    objective_type?: string;
    enabled?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ManagedObjectivesResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    
    if (params) {
      if (params.status) queryParams.status = params.status;
      if (params.target_type) queryParams.target_type = params.target_type;
      if (params.objective_type) queryParams.objective_type = params.objective_type;
      if (params.enabled !== undefined) queryParams.enabled = params.enabled;
      if (params.page) queryParams.page = params.page;
      if (params.pageSize) queryParams.pageSize = params.pageSize;
    }

    return await apiClient.get<ManagedObjectivesResponse>('/managed-objectives', queryParams);
  },

  /**
   * Get single objective detail
   */
  async getManagedObjective(id: string): Promise<ManagedObjective> {
    return await apiClient.get<ManagedObjective>(`/managed-objectives/${id}`);
  },
};
