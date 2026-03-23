/**
 * Chat API Client
 * 
 * Operator chat with Vienna (Phase 6.6 + 6.7)
 */

import { apiClient } from './client.js';

export interface ChatMessageRequest {
  threadId?: string;
  message: string;
  context?: {
    page?: string;
    selectedObjectiveId?: string;
    selectedFileIds?: string[];
    selectedService?: string;
    systemPrompt?: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    model?: string;
  };
  operator?: string;
}

export interface SystemCommandProposal {
  proposal_id: string;
  command: string;
  category: string;
  description: string;
  command_string: string;
  args: any[];
  requires_warrant: boolean;
  risk_tier: string;
  proposed_at: string;
  proposed_by: string;
}

export interface ChatMessage {
  messageId?: string;
  threadId?: string;
  message?: string;  // Phase 6.6 simple response
  classification?: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
  provider?: {
    name: string;
    model?: string;
    mode: 'deterministic' | 'keyword' | 'llm' | 'fallback' | 'recovery' | 'anthropic' | 'local';
  };
  status?: 'answered' | 'preview' | 'executing' | 'approval_required' | 'failed';
  content?: {
    text: string;
    summary?: string;
  };
  // Phase 6.7: System command proposal
  proposal?: SystemCommandProposal;
  linkedEntities?: {
    objectiveId?: string;
    envelopeId?: string;
    decisionId?: string;
    service?: string;
  };
  actionTaken?: {
    action: string;
    result: string;
  };
  auditRef?: string;
  timestamp?: string;
}

export interface ChatHistoryItem extends ChatMessage {
  role?: 'user' | 'assistant';
}

export interface ChatThread {
  threadId: string;
  title: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  status: string;
}

export const chatApi = {
  /**
   * Send message to Vienna (Phase 6.6 + Phase 6.8)
   */
  async sendMessage(request: ChatMessageRequest): Promise<{
    message: string;
    timestamp: string;
    proposal?: SystemCommandProposal;
  }> {
    const response = await apiClient.post<any, ChatMessageRequest>('/chat/message', request);
    
    // Phase 6.6/6.8 returns { message, timestamp, proposal? } format
    return {
      message: response.data?.message || response.message || 'No response',
      timestamp: response.data?.timestamp || response.timestamp || new Date().toISOString(),
      proposal: response.data?.proposal || response.proposal,
    };
  },

  /**
   * Get chat history
   */
  async getHistory(threadId: string, params?: {
    limit?: number;
    before?: string;
  }): Promise<{ threadId: string; messages: ChatHistoryItem[] }> {
    const queryParams = new URLSearchParams();
    queryParams.append('threadId', threadId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.before) queryParams.append('before', params.before);
    
    return apiClient.get(`/chat/history?${queryParams.toString()}`);
  },
  
  /**
   * Get list of threads
   */
  async getThreads(params?: {
    status?: 'active' | 'archived';
    limit?: number;
  }): Promise<{ threads: ChatThread[] }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return apiClient.get(`/chat/threads?${queryParams.toString()}`);
  },
  
  /**
   * Execute system command (Phase 6.7)
   */
  async executeCommand(commandName: string, args: any[], context: {
    operator: string;
    warrant?: string;
  }): Promise<{ success: boolean; command: string; result: any }> {
    return apiClient.post('/commands/execute', {
      commandName,
      args,
      context,
    });
  },
  
  /**
   * Approve T1 action (Phase 7.5e)
   */
  async approveAction(action: any, approver?: string): Promise<{
    success: boolean;
    result: any;
    timestamp: string;
  }> {
    const response = await apiClient.post<any, any>('/approvals/approve', {
      action,
      approver: approver || 'operator',
    });
    
    return {
      success: response.data?.success ?? response.success ?? true,
      result: response.data?.data ?? response.data ?? response,
      timestamp: response.data?.timestamp ?? response.timestamp ?? new Date().toISOString(),
    };
  },
  
  /**
   * Deny T1 action (Phase 7.5e)
   */
  async denyAction(action: any, reason?: string): Promise<{
    success: boolean;
    denied: boolean;
    timestamp: string;
  }> {
    const response = await apiClient.post<any, any>('/approvals/deny', {
      action,
      reason: reason || 'Operator denied',
    });
    
    return {
      success: response.data?.success ?? response.success ?? true,
      denied: response.data?.data?.denied ?? true,
      timestamp: response.data?.timestamp ?? response.timestamp ?? new Date().toISOString(),
    };
  },
};
