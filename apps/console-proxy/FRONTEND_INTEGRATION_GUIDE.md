# Frontend Integration Guide

## Overview

This guide covers integrating the Vienna OS Console API into frontend applications. The console-proxy provides a secure, serverless API layer for governance operations.

## Base URL

```
Production: https://console.regulator.ai
```

## Authentication

All API requests (except public routes) require authentication via one of:

1. **JWT Bearer Token** (recommended for SPAs)
2. **Session Cookie** (for server-rendered apps)
3. **API Key** (for server-to-server)

### Getting a JWT Token

```typescript
const response = await fetch('https://console.regulator.ai/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'your-password'
  })
});

const { token } = await response.json();
```

### Using the Token

```typescript
const response = await fetch('https://console.regulator.ai/api/v1/agents', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## API Client Example

```typescript
// api-client.ts
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
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ success: boolean; token: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.token = data.token;
    localStorage.setItem('vienna_token', data.token);
    return data;
  }

  async logout() {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('vienna_token');
  }

  // Agents
  async getAgents() {
    return this.request<{ success: boolean; data: any[] }>('/api/v1/agents');
  }

  async createAgent(agent: {
    name: string;
    description?: string;
    provider: string;
  }) {
    return this.request('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(id: string) {
    return this.request(`/api/v1/agents/${id}`, { method: 'DELETE' });
  }

  // Proposals
  async getProposals(params?: { status?: string; agent_id?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/proposals${query ? '?' + query : ''}`);
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

  // Policies
  async getPolicies() {
    return this.request('/api/v1/policies');
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

  // Analytics
  async getStats(period: '24h' | '7d' | '30d' = '24h') {
    return this.request(`/api/v1/stats?period=${period}`);
  }

  async getExecutionTrends() {
    return this.request('/api/v1/stats/executions/trends');
  }

  async getApprovalTrends() {
    return this.request('/api/v1/stats/approvals/trends');
  }

  async getRiskDistribution() {
    return this.request('/api/v1/stats/risk-distribution');
  }

  // Audit Log
  async getAuditLog(params?: {
    agent_id?: string;
    event?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/audit${query ? '?' + query : ''}`);
  }

  // Event Stream (SSE)
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

export default ViennaAPIClient;
```

## React Hook Example

```typescript
// useVienna.ts
import { useState, useEffect } from 'react';
import ViennaAPIClient from './api-client';

const client = new ViennaAPIClient();

export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client
      .getAgents()
      .then((res) => setAgents(res.data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading, error };
}

export function useProposals(filters?: { status?: string }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client
      .getProposals(filters)
      .then((res) => setProposals(res.data))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [filters?.status]);

  const approve = async (id: string, justification?: string) => {
    await client.approveProposal(id, justification);
    // Refresh proposals
    const res = await client.getProposals(filters);
    setProposals(res.data);
  };

  const reject = async (id: string, reason: string) => {
    await client.rejectProposal(id, reason);
    // Refresh proposals
    const res = await client.getProposals(filters);
    setProposals(res.data);
  };

  return { proposals, loading, error, approve, reject };
}

export function useEventStream() {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = client.subscribeToEvents(
      (event) => {
        setEvents((prev) => [...prev, event]);
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
```

## Component Example

```tsx
// Dashboard.tsx
import React from 'react';
import { useAgents, useProposals, useEventStream } from './useVienna';

export default function Dashboard() {
  const { agents, loading: agentsLoading } = useAgents();
  const { proposals, approve, reject, loading: proposalsLoading } = useProposals({
    status: 'pending',
  });
  const { events, connected } = useEventStream();

  if (agentsLoading || proposalsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Vienna OS Console</h1>

      <section>
        <h2>Agents ({agents.length})</h2>
        <ul>
          {agents.map((agent: any) => (
            <li key={agent.id}>
              {agent.name} - {agent.status}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Pending Proposals ({proposals.length})</h2>
        {proposals.map((proposal: any) => (
          <div key={proposal.id} className="proposal-card">
            <h3>{proposal.action_name}</h3>
            <p>Agent: {proposal.agent_id}</p>
            <p>Risk: {proposal.risk_tier}</p>
            <button onClick={() => approve(proposal.id)}>Approve</button>
            <button onClick={() => reject(proposal.id, 'Denied')}>Reject</button>
          </div>
        ))}
      </section>

      <section>
        <h2>Live Events {connected ? '🟢' : '🔴'}</h2>
        <ul>
          {events.slice(-5).map((event, i) => (
            <li key={i}>
              {event.event}: {event.message}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## Error Handling

```typescript
try {
  const agents = await client.getAgents();
} catch (error: any) {
  if (error.message.includes('Authentication required')) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.message.includes('Unauthorized')) {
    // Token expired, refresh it
    await client.refreshToken();
    // Retry request
  } else {
    // Handle other errors
    console.error('API error:', error);
  }
}
```

## Rate Limiting

The API enforces rate limits:
- **100 requests/minute** per user
- **1000 requests/hour** per tenant

Handle rate limit errors:

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
}
```

## Best Practices

1. **Cache Tokens**: Store JWT tokens securely (localStorage for web, secure storage for mobile)
2. **Refresh Tokens**: Implement automatic token refresh before expiry
3. **Handle Errors**: Gracefully handle network errors and 401/403 responses
4. **Use Event Streams**: Subscribe to `/api/v1/events` for real-time updates
5. **Batch Requests**: Use query parameters to fetch related data in one request
6. **Retry Logic**: Implement exponential backoff for transient failures
7. **CORS**: Ensure your domain is whitelisted in console-proxy CORS config

## Testing

Use the health endpoint to verify API connectivity:

```bash
curl https://console.regulator.ai/api/v1/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-03-30T23:30:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency_ms": 45 },
    "cache": { "status": "healthy", "size": 0 }
  }
}
```

## Support

- **Documentation**: https://regulator.ai/docs
- **API Reference**: https://regulator.ai/docs/api-reference
- **Status**: https://regulator.ai/status

---

**Version**: 1.0.0  
**Last Updated**: 2026-03-30
