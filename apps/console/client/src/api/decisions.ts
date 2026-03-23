/**
 * Decisions API
 */

import { apiClient } from './client.js';
import type { DecisionItem } from './types.js';

export const decisionsApi = {
  /**
   * List decision items
   */
  list: () => apiClient.get<DecisionItem[]>('/decisions'),
};
