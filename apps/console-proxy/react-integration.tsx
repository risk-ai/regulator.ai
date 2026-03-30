// react-integration.tsx
// Complete React integration example for Vienna OS Console API

import React, { useState, useEffect, useCallback } from 'react';

// ========== API Client ==========

interface AuthResponse {
  success: boolean;
  token: string;
  user?: any;
}

interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

class ViennaAPIClient {
  private baseURL: string;
  private token: string | null;

  constructor(baseURL: string = 'https://console.regulator.ai') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('vienna_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // ========== Auth ==========

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    localStorage.setItem('vienna_token', data.token);
    return data;
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('vienna_token');
  }

  async register(email: string, password: string, full_name: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    this.token = data.token;
    localStorage.setItem('vienna_token', data.token);
    return data;
  }

  // ========== Agents ==========

  async getAgents(): Promise<APIResponse<any[]>> {
    return this.request('/api/v1/agents');
  }

  async createAgent(agent: { name: string; description?: string; provider: string }) {
    return this.request('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(id: string) {
    return this.request(`/api/v1/agents/${id}`, { method: 'DELETE' });
  }

  // ========== Proposals ==========

  async getProposals(params?: { status?: string; agent_id?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<APIResponse<any[]>>(`/api/v1/proposals${query ? '?' + query : ''}`);
  }

  async approveProposal(id: string, justification?: string) {
    return this.request(`/api/v1/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ justification }),
    });
  }

  async rejectProposal(id: string, reason: string) {
    return this.request(`/api/v1/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ========== Policies ==========

  async getPolicies() {
    return this.request<APIResponse<any[]>>('/api/v1/policies');
  }

  async createPolicy(policy: {
    name: string;
    description?: string;
    risk_tier: number;
    conditions: any;
  }) {
    return this.request('/api/v1/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  // ========== Analytics ==========

  async getStats(period: '24h' | '7d' | '30d' = '24h') {
    return this.request<APIResponse<any>>(`/api/v1/stats?period=${period}`);
  }

  async getExecutionTrends() {
    return this.request<APIResponse<any[]>>('/api/v1/stats/executions/trends');
  }

  async getApprovalTrends() {
    return this.request<APIResponse<any[]>>('/api/v1/stats/approvals/trends');
  }

  async getRiskDistribution() {
    return this.request<APIResponse<any[]>>('/api/v1/stats/risk-distribution');
  }

  // ========== Audit Log ==========

  async getAuditLog(params?: {
    agent_id?: string;
    event?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<APIResponse<any[]>>(`/api/v1/audit${query ? '?' + query : ''}`);
  }

  // ========== Event Stream ==========

  subscribeToEvents(
    onEvent: (event: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseURL}/api/v1/events?token=${this.token}`
    );

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      onError?.(new Error('Event stream connection failed'));
    };

    return () => eventSource.close();
  }
}

// Singleton instance
const apiClient = new ViennaAPIClient();

// ========== React Hooks ==========

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.logout();
      setUser(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, full_name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.register(email, password, full_name);
      setUser(response.user);
      return response;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, login, logout, register };
}

export function useAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAgents();
      setAgents(response.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createAgent = async (agent: {
    name: string;
    description?: string;
    provider: string;
  }) => {
    await apiClient.createAgent(agent);
    await refresh();
  };

  const deleteAgent = async (id: string) => {
    await apiClient.deleteAgent(id);
    await refresh();
  };

  return { agents, loading, error, createAgent, deleteAgent, refresh };
}

export function useProposals(filters?: { status?: string; agent_id?: string }) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getProposals(filters);
      setProposals(response.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.agent_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const approve = async (id: string, justification?: string) => {
    await apiClient.approveProposal(id, justification);
    await refresh();
  };

  const reject = async (id: string, reason: string) => {
    await apiClient.rejectProposal(id, reason);
    await refresh();
  };

  return { proposals, loading, error, approve, reject, refresh };
}

export function usePolicies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.getPolicies();
      setPolicies(response.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPolicy = async (policy: {
    name: string;
    description?: string;
    risk_tier: number;
    conditions: any;
  }) => {
    await apiClient.createPolicy(policy);
    await refresh();
  };

  return { policies, loading, error, createPolicy, refresh };
}

export function useStats(period: '24h' | '7d' | '30d' = '24h') {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getStats(period);
        setStats(response.data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period]);

  return { stats, loading, error };
}

export function useExecutionTrends() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getExecutionTrends();
        setTrends(response.data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  return { trends, loading, error };
}

export function useRiskDistribution() {
  const [distribution, setDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDistribution = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getRiskDistribution();
        setDistribution(response.data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, []);

  return { distribution, loading, error };
}

export function useEventStream() {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = apiClient.subscribeToEvents(
      (event) => {
        setEvents((prev) => [...prev, event].slice(-100)); // Keep last 100 events
        setConnected(true);
      },
      (error) => {
        console.error('Event stream error:', error);
        setConnected(false);
      }
    );

    return unsubscribe;
  }, []);

  return { events, connected };
}

export function useAuditLog(filters?: {
  agent_id?: string;
  event?: string;
  limit?: number;
}) {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAuditLog = async () => {
      setLoading(true);
      try {
        const response = await apiClient.getAuditLog(filters);
        setAuditLog(response.data);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, [filters?.agent_id, filters?.event, filters?.limit]);

  return { auditLog, loading, error };
}

// ========== Example Components ==========

export function Dashboard() {
  const { stats, loading: statsLoading } = useStats('24h');
  const { agents, loading: agentsLoading } = useAgents();
  const { proposals, approve, reject, loading: proposalsLoading } = useProposals({
    status: 'pending',
  });
  const { events, connected } = useEventStream();

  if (statsLoading || agentsLoading || proposalsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Vienna OS Console</h1>

      {/* Stats Overview */}
      <section className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Proposals</h3>
          <p className="text-3xl font-bold">{stats?.proposals || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Executions</h3>
          <p className="text-3xl font-bold">{stats?.executions || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Approvals</h3>
          <p className="text-3xl font-bold">{stats?.approvals || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Active Agents</h3>
          <p className="text-3xl font-bold">{stats?.active_agents || 0}</p>
        </div>
      </section>

      {/* Agents */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Agents ({agents.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent: any) => (
                <tr key={agent.id}>
                  <td className="px-6 py-4">{agent.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        agent.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{agent.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Proposals */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Pending Proposals ({proposals.length})</h2>
        <div className="space-y-4">
          {proposals.map((proposal: any) => (
            <div key={proposal.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{proposal.action_name}</h3>
                  <p className="text-gray-600 mt-1">{proposal.description}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500">
                    <span>Agent: {proposal.agent_id}</span>
                    <span>Risk: {proposal.risk_tier}</span>
                    <span>{new Date(proposal.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(proposal.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(proposal.id, 'Denied by operator')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Events */}
      <section>
        <h2 className="text-2xl font-bold mb-4">
          Live Events {connected ? '🟢' : '🔴'}
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <ul className="space-y-2">
            {events.slice(-5).map((event, i) => (
              <li key={i} className="text-sm">
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>{' '}
                <span className="font-medium">{event.event}:</span> {event.message}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default apiClient;
