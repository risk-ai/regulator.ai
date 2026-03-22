/**
 * Audit API Client
 * 
 * Phase 6.10: Query audit trail from backend
 */

import { apiClient } from './client.js';
import type { AuditQueryParams, AuditResponse, AuditRecord } from './types.js';

export const auditApi = {
  /**
   * Query audit records with filters
   */
  async queryAudit(params?: AuditQueryParams): Promise<AuditResponse> {
    const queryString = new URLSearchParams();
    
    if (params?.objective_id) queryString.set('objective_id', params.objective_id);
    if (params?.envelope_id) queryString.set('envelope_id', params.envelope_id);
    if (params?.thread_id) queryString.set('thread_id', params.thread_id);
    if (params?.action) queryString.set('action', params.action);
    if (params?.operator) queryString.set('operator', params.operator);
    if (params?.result) queryString.set('result', params.result);
    if (params?.start) queryString.set('start', params.start);
    if (params?.end) queryString.set('end', params.end);
    if (params?.limit) queryString.set('limit', params.limit.toString());
    if (params?.offset) queryString.set('offset', params.offset.toString());
    
    const url = `/audit${queryString.toString() ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get<AuditResponse>(url);
    return response;
  },
  
  /**
   * Get specific audit record by ID
   */
  async getAuditRecord(id: string): Promise<AuditRecord> {
    const response = await apiClient.get<AuditRecord>(`/audit/${id}`);
    return response;
  },
};
