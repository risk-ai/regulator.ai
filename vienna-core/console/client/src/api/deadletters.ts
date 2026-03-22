/**
 * Dead Letters API
 */

import { apiClient } from './client.js';
import type { DeadLetterItem } from './types.js';

export const deadLettersApi = {
  /**
   * List dead letters
   */
  list: (params?: { state?: string; objective_id?: string }) =>
    apiClient.get<DeadLetterItem[]>('/deadletters', params),

  /**
   * Get stats
   */
  stats: () =>
    apiClient.get<{
      total: number;
      pending_review: number;
      requeued: number;
      cancelled: number;
      archived: number;
    }>('/deadletters/stats'),

  /**
   * Requeue dead letter
   */
  requeue: (envelopeId: string, operator: string, reason: string) =>
    apiClient.post<{ success: boolean; envelope_id: string; requeued_at: string }>(
      `/deadletters/${envelopeId}/requeue`,
      { operator, reason }
    ),

  /**
   * Cancel dead letter
   */
  cancel: (envelopeId: string, operator: string, reason: string) =>
    apiClient.post<{ success: boolean; envelope_id: string; cancelled_at: string }>(
      `/deadletters/${envelopeId}/cancel`,
      { operator, reason }
    ),
};
