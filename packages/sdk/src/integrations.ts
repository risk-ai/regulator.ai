import type { ViennaClient } from './client.js';
import type {
  Integration,
  IntegrationCreateParams,
  IntegrationTestResult,
  RequestOptions,
} from './types.js';

/**
 * Module for managing external integrations (Slack, webhooks, PagerDuty, etc.).
 *
 * @example
 * ```typescript
 * await vienna.integrations.create({
 *   type: 'slack',
 *   name: 'Ops Channel',
 *   config: { webhook_url: 'https://hooks.slack.com/...' },
 *   eventTypes: ['approval_required', 'policy_violation'],
 * });
 * ```
 */
export class IntegrationsModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * List all configured integrations.
   *
   * @param options - Optional request options.
   * @returns Array of integrations.
   */
  async list(options?: RequestOptions): Promise<Integration[]> {
    return this.client.request<Integration[]>('GET', '/api/v1/integrations', undefined, options);
  }

  /**
   * Get a single integration by ID.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   * @returns The integration.
   */
  async get(integrationId: string, options?: RequestOptions): Promise<Integration> {
    return this.client.request<Integration>(
      'GET',
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      undefined,
      options,
    );
  }

  /**
   * Create a new integration.
   *
   * @param params  - Integration configuration.
   * @param options - Optional request options.
   * @returns The created integration.
   */
  async create(params: IntegrationCreateParams, options?: RequestOptions): Promise<Integration> {
    return this.client.request<Integration>('POST', '/api/v1/integrations', params, options);
  }

  /**
   * Update an existing integration.
   *
   * @param integrationId - The integration identifier.
   * @param params        - Fields to update.
   * @param options       - Optional request options.
   * @returns The updated integration.
   */
  async update(
    integrationId: string,
    params: Partial<IntegrationCreateParams>,
    options?: RequestOptions,
  ): Promise<Integration> {
    return this.client.request<Integration>(
      'PATCH',
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      params,
      options,
    );
  }

  /**
   * Delete an integration.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   */
  async delete(integrationId: string, options?: RequestOptions): Promise<void> {
    await this.client.request<void>(
      'DELETE',
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      undefined,
      options,
    );
  }

  /**
   * Send a test event to an integration to verify connectivity.
   *
   * @param integrationId - The integration identifier.
   * @param options       - Optional request options.
   * @returns Test result with success status and latency.
   */
  async test(integrationId: string, options?: RequestOptions): Promise<IntegrationTestResult> {
    return this.client.request<IntegrationTestResult>(
      'POST',
      `/api/v1/integrations/${encodeURIComponent(integrationId)}/test`,
      undefined,
      options,
    );
  }

  /**
   * Toggle an integration's enabled/disabled state.
   *
   * @param integrationId - The integration identifier.
   * @param params        - Enable or disable.
   * @param options       - Optional request options.
   * @returns The updated integration.
   */
  async toggle(
    integrationId: string,
    params: { enabled: boolean },
    options?: RequestOptions,
  ): Promise<Integration> {
    return this.client.request<Integration>(
      'PATCH',
      `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
      params,
      options,
    );
  }
}
