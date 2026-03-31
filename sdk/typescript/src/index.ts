/**
 * Vienna OS TypeScript SDK
 * 
 * Strongly-typed SDK for Vienna OS AI Agent Governance Platform
 */

export interface ViennaConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

export interface Intent {
  agent_id: string;
  action: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  risk_tier?: 'T0' | 'T1' | 'T2' | 'T3';
  simulation?: boolean;
}

export interface IntentResult {
  pipeline: 'executed' | 'pending_approval' | 'blocked' | 'simulated';
  intent_id?: string;
  warrant?: Warrant;
  proposal?: Proposal;
  risk_tier?: string;
  reason?: string;
  would_approve?: boolean;
}

export interface Warrant {
  id: string;
  intent_id: string;
  agent_id: string;
  action: string;
  status: 'active' | 'expired' | 'revoked';
  issued_at: string;
  expires_at?: string;
  signature: string;
}

export interface Proposal {
  id: string;
  intent_id: string;
  agent_id: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewer?: string;
  reason?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  default_tier: string;
  capabilities: string[];
  config: Record<string, any>;
  status: 'active' | 'suspended' | 'terminated';
  created_at: string;
  updated_at?: string;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  tier: string;
  rules: Record<string, any>;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ViennaClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: ViennaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: any = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const data: any = await response.json();
      return (data.data !== undefined ? data.data : data) as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  /**
   * Submit an intent for governance evaluation
   */
  async submitIntent(intent: Intent): Promise<IntentResult> {
    return this.request<IntentResult>('POST', '/api/v1/agent/intent', intent);
  }

  /**
   * Simulate an intent without execution
   */
  async simulate(intent: Omit<Intent, 'simulation'>): Promise<IntentResult> {
    return this.submitIntent({ ...intent, simulation: true });
  }

  /**
   * Verify a warrant
   */
  async verifyWarrant(
    warrantId: string,
    signature?: string
  ): Promise<{ valid: boolean; warrant?: Warrant }> {
    return this.request('POST', `/api/v1/warrants/${warrantId}/verify`, {
      signature,
    });
  }

  /**
   * Approve a proposal (operator action)
   */
  async approveProposal(
    proposalId: string,
    params: { reviewer: string; reason?: string }
  ): Promise<{ warrant: Warrant }> {
    return this.request('POST', `/api/v1/proposals/${proposalId}/approve`, params);
  }

  /**
   * Reject a proposal
   */
  async rejectProposal(
    proposalId: string,
    params: { reviewer: string; reason: string }
  ): Promise<{ proposal: Proposal }> {
    return this.request('POST', `/api/v1/proposals/${proposalId}/reject`, params);
  }

  /**
   * List agents (with pagination)
   */
  async listAgents(params?: {
    page?: number;
    limit?: number;
    status?: 'active' | 'suspended' | 'terminated';
    tier?: string;
  }): Promise<PaginatedResponse<Agent>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/api/v1/agents${query ? '?' + query : ''}`);
  }

  /**
   * Get a specific agent
   */
  async getAgent(agentId: string): Promise<Agent> {
    return this.request('GET', `/api/v1/agents/${agentId}`);
  }

  /**
   * Register a new agent
   */
  async registerAgent(agent: {
    name: string;
    type: string;
    description?: string;
    default_tier?: string;
    capabilities?: string[];
    config?: Record<string, any>;
  }): Promise<Agent> {
    return this.request('POST', '/api/v1/agents', agent);
  }

  /**
   * Update an agent (partial)
   */
  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    return this.request('PATCH', `/api/v1/agents/${agentId}`, updates);
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/api/v1/agents/${agentId}`);
  }

  /**
   * List policies (with pagination)
   */
  async listPolicies(params?: {
    page?: number;
    limit?: number;
    enabled?: boolean;
    tier?: string;
  }): Promise<PaginatedResponse<Policy>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request('GET', `/api/v1/policies${query ? '?' + query : ''}`);
  }

  /**
   * Get a specific policy
   */
  async getPolicy(policyId: string): Promise<Policy> {
    return this.request('GET', `/api/v1/policies/${policyId}`);
  }

  /**
   * Create a new policy
   */
  async createPolicy(policy: {
    name: string;
    tier: string;
    rules: Record<string, any>;
    description?: string;
    enabled?: boolean;
    priority?: number;
  }): Promise<Policy> {
    return this.request('POST', '/api/v1/policies', policy);
  }

  /**
   * Update a policy (partial)
   */
  async updatePolicy(policyId: string, updates: Partial<Policy>): Promise<Policy> {
    return this.request('PATCH', `/api/v1/policies/${policyId}`, updates);
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<{ deleted: boolean }> {
    return this.request('DELETE', `/api/v1/policies/${policyId}`);
  }

  /**
   * Submit multiple intents in batch
   */
  async submitBatch(intents: Intent[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{ index: number; success: boolean; intent_id?: string; error?: string }>;
  }> {
    return this.request('POST', '/api/v1/intents/batch', { intents });
  }

  /**
   * Get system health
   */
  async health(): Promise<{ status: string; uptime?: number; version?: string }> {
    return this.request('GET', '/api/v1/health');
  }
}

export default ViennaClient;
