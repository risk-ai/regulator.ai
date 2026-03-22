/**
 * Execution API
 */

import { apiClient } from './client.js';
import type {
  EnvelopeExecution,
  QueueSnapshot,
  ExecutionMetrics,
  HealthSnapshot,
  IntegritySnapshot,
} from './types.js';

export const executionApi = {
  /**
   * Get active envelopes
   */
  getActive: () => apiClient.get<EnvelopeExecution[]>('/execution/active'),

  /**
   * Get queue state
   */
  getQueue: () => apiClient.get<QueueSnapshot>('/execution/queue'),

  /**
   * Get blocked envelopes
   */
  getBlocked: () => apiClient.get<EnvelopeExecution[]>('/execution/blocked'),

  /**
   * Get metrics
   */
  getMetrics: () => apiClient.get<ExecutionMetrics>('/execution/metrics'),

  /**
   * Get health
   */
  getHealth: () => apiClient.get<HealthSnapshot>('/execution/health'),

  /**
   * Get integrity
   */
  getIntegrity: () => apiClient.get<IntegritySnapshot>('/execution/integrity'),

  /**
   * Pause execution
   */
  pause: (operator: string, reason: string) =>
    apiClient.post<{ success: boolean; paused_at: string; queued_envelopes_paused: number }>(
      '/execution/pause',
      { operator, reason }
    ),

  /**
   * Resume execution
   */
  resume: (operator: string) =>
    apiClient.post<{ success: boolean; resumed_at: string; envelopes_resumed: number }>(
      '/execution/resume',
      { operator }
    ),

  /**
   * Trigger integrity check
   */
  checkIntegrity: (operator: string) =>
    apiClient.post<{ success: boolean; integrity: IntegritySnapshot; checked_at: string }>(
      '/execution/integrity-check',
      { operator }
    ),

  /**
   * Activate emergency override
   */
  emergencyOverride: (
    operator: string,
    reason: string,
    duration_minutes: number,
    metternich_approval_id: string
  ) =>
    apiClient.post<{
      success: boolean;
      override_id: string;
      activated_at: string;
      expires_at: string;
      audit_event_id: string;
    }>('/execution/emergency-override', {
      operator,
      reason,
      duration_minutes,
      metternich_approval_id,
    }),
};
