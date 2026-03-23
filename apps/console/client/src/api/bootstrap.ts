/**
 * Bootstrap API Client
 * 
 * Unified initial state loading for Operator Shell
 */

import { apiClient } from './client.js';
import type { SystemStatus } from './types.js';
import type { ServiceStatus, ProviderHealth } from './system.js';
import type { ChatHistoryItem, ChatThread } from './chat.js';

export interface ProvidersResponse {
  primary: string;
  fallback: string[];
  providers: Record<string, ProviderHealth>;
}

export interface DashboardBootstrapResponse {
  timestamp: string;
  
  systemStatus: {
    available: boolean;
    data?: SystemStatus;
    error?: string;
  };
  
  providers: {
    available: boolean;
    data?: ProvidersResponse;
    error?: string;
  };
  
  services: {
    available: boolean;
    data?: ServiceStatus[];
    error?: string;
  };
  
  chat: {
    available: boolean;
    currentThreadId?: string | null;
    currentThread?: {
      threadId: string;
      title?: string | null;
      updatedAt: string;
      messageCount: number;
    } | null;
    recentMessages?: ChatHistoryItem[];
    error?: string;
  };
  
  objectives?: {
    available: boolean;
    items?: Array<any>;
    blockedCount?: number;
    deadLetterCount?: number;
    error?: string;
  };
  
  replay?: {
    available: boolean;
  };
}

export const bootstrapApi = {
  /**
   * Get unified dashboard bootstrap
   */
  async getBootstrap(params?: {
    includeCurrentThread?: boolean;
    chatHistoryLimit?: number;
  }): Promise<DashboardBootstrapResponse> {
    const queryParams = new URLSearchParams();
    if (params?.includeCurrentThread === false) {
      queryParams.append('includeCurrentThread', 'false');
    }
    if (params?.chatHistoryLimit) {
      queryParams.append('chatHistoryLimit', params.chatHistoryLimit.toString());
    }
    
    const query = queryParams.toString();
    return apiClient.get(`/dashboard/bootstrap${query ? `?${query}` : ''}`);
  },
};
