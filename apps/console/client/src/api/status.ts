/**
 * Status API Client
 * 
 * System status endpoints
 */

import { apiClient } from './client.js';

export interface SystemStatus {
  system_state: string;
  executor_state: string;
  paused: boolean;
  pause_reason?: string;
  trading_guard_state: string;
  queue_depth: number;
  active_envelopes: number;
  blocked_envelopes: number;
  dead_letter_count: number;
  runtime_mode?: string;
  health: {
    state: string;
    latency_ms_avg: number;
  };
  integrity_state: string;
}

export const statusApi = {
  /**
   * Get system status
   */
  async getStatus(): Promise<SystemStatus> {
    return await apiClient.get<SystemStatus>('/system/status');
  },
};
