/**
 * Directives API
 */

import { apiClient } from './client.js';
import type { RiskTier } from './types.js';

export const directivesApi = {
  /**
   * Submit directive
   */
  submit: (operator: string, text: string, risk_tier: RiskTier, metadata?: Record<string, unknown>) =>
    apiClient.post<{
      success: boolean;
      directive_id: string;
      objective_id: string;
      created_at: string;
    }>('/directives', { operator, text, risk_tier, metadata }),
};
