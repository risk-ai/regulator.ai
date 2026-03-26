import type { ViennaClient } from './client.js';
import type {
  Approval,
  ApprovalListParams,
  ApproveParams,
  DenyParams,
  RequestOptions,
} from './types.js';
import { buildQuery } from './utils.js';

/**
 * Module for managing approval workflows.
 *
 * @example
 * ```typescript
 * const pending = await vienna.approvals.list({ status: 'pending' });
 * await vienna.approvals.approve('appr-123', { operator: 'jane', notes: 'LGTM' });
 * ```
 */
export class ApprovalsModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * List approvals, optionally filtered by status or source.
   *
   * @param params  - Filter parameters.
   * @param options - Optional request options.
   * @returns Array of approvals.
   */
  async list(params?: ApprovalListParams, options?: RequestOptions): Promise<Approval[]> {
    const query = buildQuery(params ?? {});
    return this.client.request<Approval[]>('GET', `/api/v1/approvals${query}`, undefined, options);
  }

  /**
   * Get a single approval by ID.
   *
   * @param approvalId - The approval identifier.
   * @param options    - Optional request options.
   * @returns The approval.
   */
  async get(approvalId: string, options?: RequestOptions): Promise<Approval> {
    return this.client.request<Approval>('GET', `/api/v1/approvals/${encodeURIComponent(approvalId)}`, undefined, options);
  }

  /**
   * Approve a pending action.
   *
   * @param approvalId - The approval identifier.
   * @param params     - Approval details (operator, optional notes).
   * @param options    - Optional request options.
   * @returns The updated approval.
   */
  async approve(approvalId: string, params: ApproveParams, options?: RequestOptions): Promise<Approval> {
    return this.client.request<Approval>(
      'POST',
      `/api/v1/approvals/${encodeURIComponent(approvalId)}/approve`,
      params,
      options,
    );
  }

  /**
   * Deny a pending action.
   *
   * @param approvalId - The approval identifier.
   * @param params     - Denial details (operator, reason).
   * @param options    - Optional request options.
   * @returns The updated approval.
   */
  async deny(approvalId: string, params: DenyParams, options?: RequestOptions): Promise<Approval> {
    return this.client.request<Approval>(
      'POST',
      `/api/v1/approvals/${encodeURIComponent(approvalId)}/deny`,
      params,
      options,
    );
  }
}
