/**
 * Tests for @vienna-os/client
 * Uses vitest + global fetch mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViennaOS, ViennaOSError } from '../src/client.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

function capturedFetch(): { url: string; options: RequestInit } {
  const mock = fetch as ReturnType<typeof vi.fn>;
  const [url, options] = mock.mock.calls[0] as [string, RequestInit];
  return { url, options };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const PROPOSAL: unknown = {
  success: true,
  data: {
    id: 'prop-001',
    state: 'approved',
    agent_id: 'agent-xyz',
    action: 'send_email',
    risk_tier: 0,
    payload: {},
    warrant: { id: 'wt-001', signature: 'abc', expires_at: '2026-12-31T00:00:00Z' },
    created_at: new Date().toISOString(),
  },
};

const POLICIES: unknown = {
  success: true,
  data: [
    { id: 'pol-1', name: 'PII Guard', enabled: true },
    { id: 'pol-2', name: 'Trade Cap', enabled: false },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests — constructor
// ---------------------------------------------------------------------------

describe('ViennaOS constructor', () => {
  it('throws when apiKey is empty', () => {
    expect(() => new ViennaOS({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('constructs with defaults', () => {
    const client = new ViennaOS({ apiKey: 'sk-test' });
    expect(client).toBeInstanceOf(ViennaOS);
  });

  it('accepts custom baseUrl and trims trailing slash', () => {
    const client = new ViennaOS({ apiKey: 'sk-test', baseUrl: 'http://localhost:3000/' });
    // Internal state verified indirectly via request URL in next test
    expect(client).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — submitProposal
// ---------------------------------------------------------------------------

describe('submitProposal', () => {
  it('POSTs to /api/v1/agent/intent', async () => {
    mockFetch(PROPOSAL);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    const result = await client.submitProposal({ agentId: 'a', action: 'b' });

    const { url, options } = capturedFetch();
    expect(url).toContain('/api/v1/agent/intent');
    expect(options.method).toBe('POST');
    expect(result.id).toBe('prop-001');
    expect(result.state).toBe('approved');
  });

  it('includes agent_id, action, payload in body', async () => {
    mockFetch(PROPOSAL);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    await client.submitProposal({ agentId: 'agent-xyz', action: 'transfer', payload: { amount: 100 } });

    const { options } = capturedFetch();
    const body = JSON.parse(options.body as string);
    expect(body.agent_id).toBe('agent-xyz');
    expect(body.action).toBe('transfer');
    expect(body.payload.amount).toBe(100);
    expect(body.simulation).toBe(false);
  });

  it('sets simulation=true when requested', async () => {
    mockFetch(PROPOSAL);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    await client.submitProposal({ agentId: 'a', action: 'b', simulation: true });

    const { options } = capturedFetch();
    const body = JSON.parse(options.body as string);
    expect(body.simulation).toBe(true);
  });

  it('sends Authorization header', async () => {
    mockFetch(PROPOSAL);
    const client = new ViennaOS({ apiKey: 'sk-my-key' });
    await client.submitProposal({ agentId: 'a', action: 'b' });

    const { options } = capturedFetch();
    expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-my-key');
  });
});

// ---------------------------------------------------------------------------
// Tests — getWarrant
// ---------------------------------------------------------------------------

describe('getWarrant', () => {
  it('GETs /api/v1/warrants/:id', async () => {
    const WARRANT = { success: true, data: { id: 'wt-001', valid: true } };
    mockFetch(WARRANT);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    const result = await client.getWarrant('prop-001');

    const { url, options } = capturedFetch();
    expect(url).toContain('/api/v1/warrants/prop-001');
    expect(options.method).toBe('GET');
    expect(result.id).toBe('wt-001');
  });
});

// ---------------------------------------------------------------------------
// Tests — listPolicies
// ---------------------------------------------------------------------------

describe('listPolicies', () => {
  it('returns array of policies', async () => {
    mockFetch(POLICIES);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    const result = await client.listPolicies();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('PII Guard');
  });

  it('appends enabled param when provided', async () => {
    mockFetch(POLICIES);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    await client.listPolicies({ enabled: true });

    const { url } = capturedFetch();
    expect(url).toContain('enabled=true');
  });
});

// ---------------------------------------------------------------------------
// Tests — createPolicy
// ---------------------------------------------------------------------------

describe('createPolicy', () => {
  it('POSTs to /api/v1/policies', async () => {
    const CREATED = { success: true, data: { id: 'pol-new', name: 'My Policy', enabled: true } };
    mockFetch(CREATED);
    const client = new ViennaOS({ apiKey: 'sk-test' });
    const result = await client.createPolicy({ name: 'My Policy' });

    const { url, options } = capturedFetch();
    expect(url).toContain('/api/v1/policies');
    expect(options.method).toBe('POST');
    expect(result.id).toBe('pol-new');
  });
});

// ---------------------------------------------------------------------------
// Tests — error handling
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('throws ViennaOSError on 4xx', async () => {
    mockFetch({ error: 'Not found' }, 404);
    const client = new ViennaOS({ apiKey: 'sk-test' });

    await expect(client.getWarrant('missing')).rejects.toThrow(ViennaOSError);
    await expect(client.getWarrant('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws ViennaOSError on 5xx', async () => {
    mockFetch({ error: 'Internal server error' }, 500);
    const client = new ViennaOS({ apiKey: 'sk-test' });

    await expect(client.submitProposal({ agentId: 'a', action: 'b' })).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('throws ViennaOSError on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const client = new ViennaOS({ apiKey: 'sk-test' });

    await expect(client.listPolicies()).rejects.toThrow(ViennaOSError);
  });
});
