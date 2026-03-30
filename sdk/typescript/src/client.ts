/**
 * Vienna OS TypeScript Client
 */

import type {
  ExecutionResult,
  Approval,
  Warrant,
  Policy,
  Agent,
  ExecutionOptions,
  ApprovalFilter,
  PolicyFilter,
  ApiResponse
} from './types';
import { ViennaError, AuthenticationError, ValidationError, NotFoundError } from './errors';

export class ViennaClient {
  private baseUrl: string;
  private token?: string;
  private apiKey?: string;

  constructor(options: {
    baseUrl?: string;
    apiKey?: string;
    email?: string;
    password?: string;
  }) {
    this.baseUrl = (options.baseUrl || 'https://console.regulator.ai/api/v1').replace(/\/$/, '');
    this.apiKey = options.apiKey;

    // Auto-login if credentials provided
    if (options.email && options.password) {
      this.login(options.email, options.password);
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, '')}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    } else if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (response.status === 401) {
        throw new AuthenticationError('Authentication failed');
      } else if (response.status === 400) {
        throw new ValidationError(result.error || 'Validation error');
      } else if (response.status === 404) {
        throw new NotFoundError(result.error || 'Not found');
      } else if (response.status >= 400) {
        throw new ViennaError(`API error: ${response.status} - ${result.error || response.statusText}`);
      }

      return result as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ViennaError) throw error;
      throw new ViennaError(`Request failed: ${error}`);
    }
  }

  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const result = await this.request<{ token: string; user: any }>('POST', '/auth/login', {
      email,
      password,
    });

    if (result.success && result.token) {
      this.token = result.token;
      return { token: result.token, user: result.user };
    } else {
      throw new AuthenticationError(result.error || 'Login failed');
    }
  }

  // Execution API

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const result = await this.request<ExecutionResult>('POST', '/execute', {
      action: options.action,
      agent_id: options.agentId,
      context: options.context || {},
      tier: options.tier || 'T0',
    });

    if (!result.success) {
      throw new ViennaError(result.error || 'Execution failed');
    }

    return result.data!;
  }

  async getExecutions(filters?: {
    limit?: number;
    offset?: number;
    status?: string;
    tier?: string;
  }): Promise<any[]> {
    const params: Record<string, string> = {};
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.offset) params.offset = filters.offset.toString();
    if (filters?.status) params.status = filters.status;
    if (filters?.tier) params.tier = filters.tier;

    const result = await this.request<any[]>('GET', '/executions', undefined, params);
    return result.data || [];
  }

  async getExecution(executionId: string): Promise<any> {
    const result = await this.request<any>('GET', `/executions/${executionId}`);
    return result.data;
  }

  async getExecutionStats(): Promise<any> {
    const result = await this.request<any>('GET', '/executions/stats');
    return result.data;
  }

  // Approvals API

  async getApprovals(filters?: ApprovalFilter): Promise<Approval[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.tier) params.tier = filters.tier;

    const result = await this.request<Approval[]>('GET', '/approvals', undefined, params);
    return result.data || [];
  }

  async approve(approvalId: string, reviewerId: string, notes?: string): Promise<any> {
    const result = await this.request<any>('POST', `/approvals/${approvalId}/approve`, {
      reviewer_id: reviewerId,
      notes,
    });
    return result.data;
  }

  async reject(approvalId: string, reviewerId: string, reason: string): Promise<any> {
    const result = await this.request<any>('POST', `/approvals/${approvalId}/reject`, {
      reviewer_id: reviewerId,
      reason,
    });
    return result.data;
  }

  // Warrants API

  async getWarrants(limit: number = 50): Promise<Warrant[]> {
    const result = await this.request<Warrant[]>('GET', '/warrants', undefined, {
      limit: limit.toString(),
    });
    return result.data || [];
  }

  async verifyWarrant(warrantId: string, signature: string): Promise<any> {
    const result = await this.request<any>('POST', '/warrants/verify', {
      warrant_id: warrantId,
      signature,
    });
    return result.data;
  }

  // Policies API

  async getPolicies(filters?: PolicyFilter): Promise<Policy[]> {
    const params: Record<string, string> = {};
    if (filters?.enabled !== undefined) params.enabled = filters.enabled.toString();
    if (filters?.tier) params.tier = filters.tier;

    const result = await this.request<Policy[]>('GET', '/policies', undefined, params);
    return result.data || [];
  }

  async createPolicy(policy: Partial<Policy>): Promise<Policy> {
    const result = await this.request<Policy>('POST', '/policies', policy);
    return result.data!;
  }

  async updatePolicy(policyId: string, updates: Partial<Policy>): Promise<any> {
    const result = await this.request<any>('PUT', `/policies/${policyId}`, updates);
    return result.data;
  }

  async deletePolicy(policyId: string): Promise<boolean> {
    const result = await this.request<any>('DELETE', `/policies/${policyId}`);
    return result.success || false;
  }

  // Agents API

  async getAgents(filters?: { status?: string; tier?: string }): Promise<Agent[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.tier) params.tier = filters.tier;

    const result = await this.request<Agent[]>('GET', '/agents', undefined, params);
    return result.data || [];
  }

  async registerAgent(agent: Partial<Agent>): Promise<Agent> {
    const result = await this.request<Agent>('POST', '/agents', agent);
    return result.data!;
  }

  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<any> {
    const result = await this.request<any>('PUT', `/agents/${agentId}`, updates);
    return result.data;
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const result = await this.request<any>('DELETE', `/agents/${agentId}`);
    return result.success || false;
  }

  // Health API

  async health(): Promise<any> {
    const result = await this.request<any>('GET', '/health');
    return result;
  }

  // Event Stream (SSE)

  createEventStream(onEvent: (event: any) => void, onError?: (error: Error) => void): EventSource {
    const url = `${this.baseUrl}/events`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (error) {
        if (onError) onError(new Error('Failed to parse event'));
      }
    };

    eventSource.onerror = (error) => {
      if (onError) onError(new Error('EventSource error'));
    };

    return eventSource;
  }
}
