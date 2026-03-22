/**
 * Dashboard API
 */

import { apiClient } from './client.js';
import type { DashboardBootstrapResponse } from './types.js';

export const dashboardApi = {
  /**
   * Bootstrap entire dashboard
   */
  bootstrap: () => apiClient.get<DashboardBootstrapResponse>('/dashboard'),
};
