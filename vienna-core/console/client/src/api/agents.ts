/**
 * Agents API
 */

import { apiClient } from './client.js';
import type { AgentSummary } from './types.js';

export const agentsApi = {
  /**
   * List agents
   */
  list: () => apiClient.get<AgentSummary[]>('/agents'),

  /**
   * Request agent reasoning
   */
  reason: (agentId: string, operator: string, prompt: string, context?: Record<string, unknown>) =>
    apiClient.post<{ success: boolean; session_id: string; response?: string }>(
      `/agents/${agentId}/reason`,
      { operator, prompt, context }
    ),
};
