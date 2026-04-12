/**
 * Dashboard API
 */

import { apiClient } from './client.js';
import type { DashboardBootstrapResponse } from './types.js';

export type TimeRange = '24h' | '7d' | '30d' | '90d';

export const dashboardApi = {
  /**
   * Bootstrap entire dashboard
   */
  bootstrap: () => apiClient.get<DashboardBootstrapResponse>('/dashboard'),
};

export function getDashboardMetrics() {
  return dashboardApi.bootstrap();
}

export function getSparklineData(metric: string, range: TimeRange, points: number) {
  // TODO: Implement dedicated sparkline endpoint when backend adds it
  // For now, return empty array
  return Promise.resolve([]);
}
