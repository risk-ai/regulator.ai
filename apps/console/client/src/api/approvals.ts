/**
 * Approval API Client (Phase 17 Stage 4)
 * 
 * Frontend interface to approval state machine.
 */

import { apiClient } from './client';

export interface Approval {
  approval_id: string;
  plan_id: string;
  execution_id: string;
  step_id?: string;
  tier: 'T1' | 'T2';
  target_id: string;
  action_type: string;
  action_summary: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requested_by: string;
  requested_at: number;
  reviewed_by?: string;
  reviewed_at?: number;
  decision_reason?: string;
  expires_at?: number;
  is_expired?: boolean;
  time_until_expiry_ms?: number;
  metadata?: Record<string, any>;
}

export interface ApprovalDetail {
  approval: Approval;
  plan?: any;
  execution?: any;
}

export interface ApprovalListResponse {
  success: boolean;
  data: Approval[];
  count: number;
  timestamp: string;
}

export interface ApprovalDetailResponse {
  success: boolean;
  data: ApprovalDetail;
  timestamp: string;
}

export interface ApprovalActionResponse {
  success: boolean;
  data: Approval;
  timestamp: string;
}

/**
 * List approvals with optional filters
 */
export async function listApprovals(filters?: {
  status?: 'pending' | 'approved' | 'denied' | 'expired';
  tier?: 'T1' | 'T2';
  target_id?: string;
  limit?: number;
}): Promise<Approval[]> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.tier) params.append('tier', filters.tier);
  if (filters?.target_id) params.append('target_id', filters.target_id);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  
  // apiClient.get already extracts .data from the response
  const data = await apiClient.get<Approval[]>(
    `/approvals?${params.toString()}`
  );
  
  return data;
}

/**
 * Get approval detail with context
 */
export async function getApprovalDetail(approval_id: string): Promise<ApprovalDetail> {
  // apiClient.get already extracts .data from the response
  const data = await apiClient.get<ApprovalDetail>(
    `/approvals/${approval_id}`
  );
  
  return data;
}

/**
 * Approve pending approval
 */
export async function approveApproval(
  approval_id: string,
  reviewed_by: string,
  decision_reason?: string
): Promise<Approval> {
  // apiClient.post already extracts .data from the response
  const data = await apiClient.post<Approval>(
    `/approvals/${approval_id}/approve`,
    {
      reviewed_by,
      decision_reason: decision_reason || null,
    }
  );
  
  return data;
}

/**
 * Deny pending approval
 */
export async function denyApproval(
  approval_id: string,
  reviewed_by: string,
  decision_reason: string
): Promise<Approval> {
  // apiClient.post already extracts .data from the response
  const data = await apiClient.post<Approval>(
    `/approvals/${approval_id}/deny`,
    {
      reviewed_by,
      decision_reason,
    }
  );
  
  return data;
}
