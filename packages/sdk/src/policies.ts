import type { ViennaClient } from './client.js';
import type {
  PolicyRule,
  PolicyCreateParams,
  PolicyUpdateParams,
  PolicyListParams,
  PolicyEvaluation,
  PolicyTemplate,
  RequestOptions,
} from './types.js';
import { buildQuery } from './utils.js';

/**
 * Module for managing governance policies.
 *
 * @example
 * ```typescript
 * const policies = await vienna.policies.list({ enabled: true });
 * const rule = await vienna.policies.create({
 *   name: 'High-Value Gate',
 *   conditions: [{ field: 'amount', operator: 'gt', value: 10000 }],
 *   actionOnMatch: 'require_approval',
 *   priority: 100,
 * });
 * ```
 */
export class PoliciesModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * List all policies, optionally filtered.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of policy rules.
   */
  async list(params?: PolicyListParams, options?: RequestOptions): Promise<PolicyRule[]> {
    const query = buildQuery(params ?? {});
    return this.client.request<PolicyRule[]>('GET', `/api/v1/policies${query}`, undefined, options);
  }

  /**
   * Get a single policy by ID.
   *
   * @param policyId - The policy identifier.
   * @param options  - Optional request options.
   * @returns The policy rule.
   */
  async get(policyId: string, options?: RequestOptions): Promise<PolicyRule> {
    return this.client.request<PolicyRule>('GET', `/api/v1/policies/${encodeURIComponent(policyId)}`, undefined, options);
  }

  /**
   * Create a new governance policy.
   *
   * @param params  - Policy creation parameters.
   * @param options - Optional request options.
   * @returns The created policy rule.
   */
  async create(params: PolicyCreateParams, options?: RequestOptions): Promise<PolicyRule> {
    return this.client.request<PolicyRule>('POST', '/api/v1/policies', params, options);
  }

  /**
   * Update an existing policy.
   *
   * @param policyId - The policy identifier.
   * @param params   - Fields to update.
   * @param options  - Optional request options.
   * @returns The updated policy rule.
   */
  async update(policyId: string, params: PolicyUpdateParams, options?: RequestOptions): Promise<PolicyRule> {
    return this.client.request<PolicyRule>('PATCH', `/api/v1/policies/${encodeURIComponent(policyId)}`, params, options);
  }

  /**
   * Delete a policy.
   *
   * @param policyId - The policy identifier.
   * @param options  - Optional request options.
   */
  async delete(policyId: string, options?: RequestOptions): Promise<void> {
    await this.client.request<void>('DELETE', `/api/v1/policies/${encodeURIComponent(policyId)}`, undefined, options);
  }

  /**
   * Evaluate policies against a test payload (dry-run).
   * Returns which policies would match and what action would be taken.
   *
   * @param payload - The test payload to evaluate.
   * @param options - Optional request options.
   * @returns Evaluation result with matched policies and final action.
   */
  async evaluate(payload: Record<string, unknown>, options?: RequestOptions): Promise<PolicyEvaluation> {
    return this.client.request<PolicyEvaluation>('POST', '/api/v1/policies/evaluate', payload, options);
  }

  /**
   * List available industry policy templates.
   *
   * @param options - Optional request options.
   * @returns Array of policy templates.
   */
  async templates(options?: RequestOptions): Promise<PolicyTemplate[]> {
    return this.client.request<PolicyTemplate[]>('GET', '/api/v1/policies/templates', undefined, options);
  }
}
