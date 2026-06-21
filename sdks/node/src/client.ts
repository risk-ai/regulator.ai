/**
 * Vienna OS Node SDK — TypeScript client
 * Package: @vienna-os/client
 */

export interface ViennaOSOptions {
  /** Tenant API key (from Settings → API Keys) */
  apiKey: string;
  /** Base URL (default: https://console.regulator.ai) */
  baseUrl?: string;
  /** HTTP timeout in ms (default: 30_000) */
  timeoutMs?: number;
}

export interface Proposal {
  id: string;
  state: 'pending' | 'approved' | 'denied' | 'warranted';
  agent_id: string;
  action: string;
  payload: Record<string, unknown>;
  risk_tier: number;
  warrant?: Warrant;
  error?: string;
  created_at: string;
}

export interface Warrant {
  id: string;
  proposal_id: string;
  signature: string;
  expires_at: string;
  revoked: boolean;
  issued_by: string;
  created_at: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  tags: string[];
  created_at: string;
  updated_at?: string;
}

export interface SubmitProposalOptions {
  agentId: string;
  action: string;
  payload?: Record<string, unknown>;
  simulation?: boolean;
  riskTier?: number;
}

export interface CreatePolicyOptions {
  name: string;
  description?: string;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  tags?: string[];
}

export interface ListPoliciesOptions {
  enabled?: boolean;
  limit?: number;
}

export class ViennaOSError extends Error {
  readonly statusCode?: number;
  readonly response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'ViennaOSError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Vienna OS governance client.
 *
 * @example
 * ```typescript
 * import { ViennaOS } from '@vienna-os/client';
 *
 * const client = new ViennaOS({ apiKey: 'sk-...' });
 *
 * const proposal = await client.submitProposal({
 *   agentId: 'agent-xyz',
 *   action: 'send_email',
 *   payload: { to: 'user@example.com', subject: 'Alert' },
 * });
 *
 * console.log(proposal.state); // 'approved' | 'pending' | 'denied'
 * ```
 */
export class ViennaOS {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: ViennaOSOptions) {
    if (!options.apiKey) {
      throw new ViennaOSError('apiKey is required');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://console.regulator.ai').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  // -------------------------------------------------------------------------
  // Proposals
  // -------------------------------------------------------------------------

  /**
   * Submit an agent action proposal for governance evaluation.
   *
   * Returns the proposal. If auto-approved, `proposal.warrant` is set.
   * If it requires human review, `proposal.state === 'pending'`.
   */
  async submitProposal(opts: SubmitProposalOptions): Promise<Proposal> {
    return this.request<Proposal>('POST', '/api/v1/agent/intent', {
      agent_id: opts.agentId,
      action: opts.action,
      payload: opts.payload ?? {},
      simulation: opts.simulation ?? false,
      ...(opts.riskTier !== undefined ? { risk_tier: opts.riskTier } : {}),
    });
  }

  // -------------------------------------------------------------------------
  // Warrants
  // -------------------------------------------------------------------------

  /**
   * Retrieve the warrant for an approved proposal.
   */
  async getWarrant(proposalId: string): Promise<Warrant> {
    return this.request<Warrant>('GET', `/api/v1/warrants/${proposalId}`);
  }

  /**
   * Verify a warrant (checks expiry and revocation status).
   */
  async verifyWarrant(warrantId: string): Promise<{ valid: boolean; reason?: string } & Partial<Warrant>> {
    return this.request('GET', `/api/v1/warrants/${warrantId}/verify`);
  }

  // -------------------------------------------------------------------------
  // Policies
  // -------------------------------------------------------------------------

  /**
   * List governance policies for the tenant.
   */
  async listPolicies(opts: ListPoliciesOptions = {}): Promise<Policy[]> {
    const params = new URLSearchParams();
    if (opts.enabled !== undefined) params.set('enabled', String(opts.enabled));
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Policy[]>('GET', `/api/v1/policies${qs}`);
  }

  /**
   * Retrieve a single policy by ID.
   */
  async getPolicy(policyId: string): Promise<Policy> {
    return this.request<Policy>('GET', `/api/v1/policies/${policyId}`);
  }

  /**
   * Create a new governance policy.
   */
  async createPolicy(opts: CreatePolicyOptions): Promise<Policy> {
    return this.request<Policy>('POST', '/api/v1/policies', {
      name: opts.name,
      description: opts.description ?? '',
      conditions: opts.conditions ?? {},
      actions: opts.actions ?? {},
      priority: opts.priority ?? 0,
      enabled: opts.enabled ?? true,
      tags: opts.tags ?? [],
    });
  }

  /**
   * Partially update an existing policy.
   */
  async updatePolicy(policyId: string, patch: Partial<CreatePolicyOptions>): Promise<Policy> {
    return this.request<Policy>('PATCH', `/api/v1/policies/${policyId}`, patch);
  }

  /**
   * Delete a policy by ID.
   */
  async deletePolicy(policyId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>('DELETE', `/api/v1/policies/${policyId}`);
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': '@vienna-os/client/0.1.0',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ViennaOSError(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw new ViennaOSError(`Request failed: ${String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    let json: Record<string, unknown> = {};
    try {
      json = (await response.json()) as Record<string, unknown>;
    } catch {
      // ignore parse error; handled below
    }

    if (!response.ok) {
      const message =
        (json['error'] as string) ||
        (json['message'] as string) ||
        `HTTP ${response.status}`;
      throw new ViennaOSError(message, response.status, json);
    }

    // Vienna OS success envelope: { success: true, data: T }
    if ('data' in json) {
      return json['data'] as T;
    }
    return json as unknown as T;
  }
}
