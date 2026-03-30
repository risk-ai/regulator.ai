/**
 * Vienna OS Client
 *
 * The main SDK entry point. Provides a typed interface to the
 * Vienna OS execution pipeline.
 *
 * @example
 * ```ts
 * import { ViennaClient } from 'vienna-os';
 *
 * const vienna = new ViennaClient({
 *   baseUrl: 'https://console.regulator.ai',
 *   agentId: 'my-agent-id',
 *   apiKey: 'vos_...',
 * });
 *
 * // Submit an intent through the governance pipeline
 * const result = await vienna.submitIntent({
 *   action: 'deploy',
 *   payload: { service: 'api-gateway', version: 'v2.4.1' },
 * });
 *
 * if (result.pipeline === 'executed') {
 *   console.log('Warrant:', result.warrant?.id);
 * } else if (result.pipeline === 'pending_approval') {
 *   console.log('Awaiting operator approval...');
 * }
 * ```
 */

import type {
  ViennaConfig,
  Intent,
  IntentResult,
  Warrant,
  WarrantVerification,
  Agent,
  AuditEntry,
  SystemStatus,
} from './types.js';
import { ViennaError, AuthError } from './errors.js';

export class ViennaClient {
  private baseUrl: string;
  private agentId: string;
  private apiKey?: string;
  private timeout: number;
  private fetchFn: typeof fetch;

  constructor(config: ViennaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.agentId = config.agentId;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  // ─── Core Pipeline ────────────────────────────────────────────────

  /**
   * Submit an intent through the governance pipeline.
   *
   * Flow: intent → policy evaluation → risk tier → warrant (or pending) → audit
   */
  async submitIntent(intent: Intent): Promise<IntentResult> {
    const data = await this.post('/api/v1/agent/intent', {
      agent_id: this.agentId,
      action: intent.action,
      payload: intent.payload ?? {},
      simulation: intent.simulation ?? false,
    });
    return data;
  }

  /**
   * Verify a warrant before execution.
   * Returns whether the warrant is still valid (not expired, not revoked).
   */
  async verifyWarrant(warrantId: string, signature?: string): Promise<WarrantVerification> {
    return this.post('/api/v1/warrants/verify', {
      warrant_id: warrantId,
      signature,
    });
  }

  /**
   * Revoke an active warrant.
   */
  async revokeWarrant(warrantId: string, reason?: string): Promise<void> {
    await this.post(`/api/v1/warrants/${warrantId}/revoke`, { reason });
  }

  // ─── Approvals ────────────────────────────────────────────────────

  /**
   * Approve a pending proposal (operator action).
   * Returns the issued warrant.
   */
  async approveProposal(proposalId: string, reviewer?: string): Promise<{ warrant: Warrant }> {
    return this.post(`/api/v1/proposals/${proposalId}/approve`, { reviewer });
  }

  /**
   * Deny a pending proposal (operator action).
   */
  async denyProposal(proposalId: string, reason: string): Promise<void> {
    await this.post(`/api/v1/proposals/${proposalId}/deny`, { reason });
  }

  // ─── Query ────────────────────────────────────────────────────────

  /**
   * List registered agents.
   */
  async listAgents(): Promise<Agent[]> {
    return this.get('/api/v1/agents');
  }

  /**
   * Get recent audit trail entries.
   */
  async getAuditTrail(limit = 50): Promise<{ entries: AuditEntry[]; total: number }> {
    return this.get(`/api/v1/audit/recent?limit=${limit}`);
  }

  /**
   * Get system health status.
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.get('/health');
  }

  // ─── Simulation ───────────────────────────────────────────────────

  /**
   * Run an intent in simulation mode (no side effects).
   * Useful for testing policy evaluation without executing.
   */
  async simulate(intent: Omit<Intent, 'simulation'>): Promise<IntentResult> {
    return this.submitIntent({ ...intent, simulation: true });
  }

  // ─── HTTP Layer ───────────────────────────────────────────────────

  private async get(path: string): Promise<any> {
    const res = await this.request('GET', path);
    return res.data;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const res = await this.request('POST', path, body);
    return res.data;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'vienna-os-sdk/0.1.0',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) throw new AuthError(data.error);
        throw new ViennaError(
          data.error || `Request failed: ${res.status}`,
          data.code || 'REQUEST_FAILED',
          res.status,
        );
      }

      return data;
    } catch (err) {
      if (err instanceof ViennaError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new ViennaError('Request timed out', 'TIMEOUT');
      }
      throw new ViennaError(
        (err as Error).message || 'Network error',
        'NETWORK_ERROR',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
