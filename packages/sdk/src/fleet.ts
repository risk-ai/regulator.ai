import type { ViennaClient } from './client.js';
import type {
  FleetAgent,
  AgentMetrics,
  AgentActivity,
  FleetAlert,
  FleetAlertParams,
  PaginationParams,
  PaginatedList,
  RequestOptions,
} from './types.js';
import { buildQuery } from './utils.js';

/**
 * Module for fleet and agent management.
 *
 * @example
 * ```typescript
 * const fleet = await vienna.fleet.list();
 * const agent = await vienna.fleet.get('billing-bot');
 * await vienna.fleet.suspend('billing-bot', { reason: 'Suspicious activity' });
 * ```
 */
export class FleetModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * List all agents in the fleet.
   *
   * @param options - Optional request options.
   * @returns Array of fleet agents.
   */
  async list(options?: RequestOptions): Promise<FleetAgent[]> {
    return this.client.request<FleetAgent[]>('GET', '/api/v1/fleet', undefined, options);
  }

  /**
   * Get a single agent by ID.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns The fleet agent.
   */
  async get(agentId: string, options?: RequestOptions): Promise<FleetAgent> {
    return this.client.request<FleetAgent>('GET', `/api/v1/fleet/${encodeURIComponent(agentId)}`, undefined, options);
  }

  /**
   * Get metrics for a specific agent.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns Agent performance metrics.
   */
  async metrics(agentId: string, options?: RequestOptions): Promise<AgentMetrics> {
    return this.client.request<AgentMetrics>('GET', `/api/v1/fleet/${encodeURIComponent(agentId)}/metrics`, undefined, options);
  }

  /**
   * Get paginated activity log for an agent.
   *
   * @param agentId    - The agent identifier.
   * @param pagination - Pagination parameters.
   * @param options    - Optional request options.
   * @returns Paginated list of agent activities.
   */
  async activity(
    agentId: string,
    pagination?: PaginationParams,
    options?: RequestOptions,
  ): Promise<PaginatedList<AgentActivity>> {
    const query = buildQuery(pagination ?? {});
    return this.client.request<PaginatedList<AgentActivity>>(
      'GET',
      `/api/v1/fleet/${encodeURIComponent(agentId)}/activity${query}`,
      undefined,
      options,
    );
  }

  /**
   * Suspend an agent, preventing it from submitting intents.
   *
   * @param agentId - The agent identifier.
   * @param params  - Suspension details.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async suspend(
    agentId: string,
    params: { reason: string },
    options?: RequestOptions,
  ): Promise<FleetAgent> {
    return this.client.request<FleetAgent>(
      'POST',
      `/api/v1/fleet/${encodeURIComponent(agentId)}/suspend`,
      params,
      options,
    );
  }

  /**
   * Reactivate a suspended agent.
   *
   * @param agentId - The agent identifier.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async activate(agentId: string, options?: RequestOptions): Promise<FleetAgent> {
    return this.client.request<FleetAgent>(
      'POST',
      `/api/v1/fleet/${encodeURIComponent(agentId)}/activate`,
      undefined,
      options,
    );
  }

  /**
   * Manually adjust an agent's trust score.
   *
   * @param agentId - The agent identifier.
   * @param params  - New trust score and reason.
   * @param options - Optional request options.
   * @returns The updated agent.
   */
  async setTrust(
    agentId: string,
    params: { score: number; reason: string },
    options?: RequestOptions,
  ): Promise<FleetAgent> {
    return this.client.request<FleetAgent>(
      'PUT',
      `/api/v1/fleet/${encodeURIComponent(agentId)}/trust`,
      params,
      options,
    );
  }

  /**
   * List fleet-wide alerts.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of fleet alerts.
   */
  async alerts(params?: FleetAlertParams, options?: RequestOptions): Promise<FleetAlert[]> {
    const query = buildQuery(params ?? {});
    return this.client.request<FleetAlert[]>('GET', `/api/v1/fleet/alerts${query}`, undefined, options);
  }

  /**
   * Resolve a fleet alert.
   *
   * @param alertId - The alert identifier.
   * @param params  - Resolution details.
   * @param options - Optional request options.
   * @returns The resolved alert.
   */
  async resolveAlert(
    alertId: string,
    params: { resolvedBy: string },
    options?: RequestOptions,
  ): Promise<FleetAlert> {
    return this.client.request<FleetAlert>(
      'POST',
      `/api/v1/fleet/alerts/${encodeURIComponent(alertId)}/resolve`,
      params,
      options,
    );
  }
}
