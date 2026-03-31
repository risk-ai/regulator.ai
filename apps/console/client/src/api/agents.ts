/**
 * Agents API
 */

import { apiClient } from './client.js';
import type { AgentSummary } from './types.js';

export interface CreateAgentPayload {
  name: string;
  type: string;
  description?: string;
  default_tier?: string;
  capabilities?: string[];
  config?: Record<string, unknown>;
}

export interface CreatedAgent {
  id: string;
  name: string;
  type: string;
  default_tier: string;
  status: string;
}

export const agentsApi = {
  /**
   * List agents
   */
  list: () => apiClient.get<AgentSummary[]>('/agents'),

  /**
   * Create/register a new agent
   */
  create: (payload: CreateAgentPayload) => 
    apiClient.post<CreatedAgent>('/agents', payload),

  /**
   * Request agent reasoning
   */
  reason: (agentId: string, operator: string, prompt: string, context?: Record<string, unknown>) =>
    apiClient.post<{ success: boolean; session_id: string; response?: string }>(
      `/agents/${agentId}/reason`,
      { operator, prompt, context }
    ),
};
