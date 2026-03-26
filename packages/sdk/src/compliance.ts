import type { ViennaClient } from './client.js';
import type {
  ComplianceReport,
  ComplianceGenerateParams,
  ComplianceSummary,
  QuickStatsParams,
  RequestOptions,
} from './types.js';
import { buildQuery } from './utils.js';

/**
 * Module for compliance reporting and statistics.
 *
 * @example
 * ```typescript
 * const report = await vienna.compliance.generate({
 *   type: 'quarterly',
 *   periodStart: '2026-01-01',
 *   periodEnd: '2026-03-31',
 * });
 * const stats = await vienna.compliance.quickStats({ days: 30 });
 * ```
 */
export class ComplianceModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * Generate a new compliance report.
   *
   * @param params  - Report parameters (type, period).
   * @param options - Optional request options.
   * @returns The created report (may still be generating).
   */
  async generate(params: ComplianceGenerateParams, options?: RequestOptions): Promise<ComplianceReport> {
    return this.client.request<ComplianceReport>('POST', '/api/v1/compliance/reports', params, options);
  }

  /**
   * Get a compliance report by ID.
   *
   * @param reportId - The report identifier.
   * @param options  - Optional request options.
   * @returns The compliance report with summary data.
   */
  async get(reportId: string, options?: RequestOptions): Promise<ComplianceReport> {
    return this.client.request<ComplianceReport>(
      'GET',
      `/api/v1/compliance/reports/${encodeURIComponent(reportId)}`,
      undefined,
      options,
    );
  }

  /**
   * List all compliance reports.
   *
   * @param options - Optional request options.
   * @returns Array of compliance reports.
   */
  async list(options?: RequestOptions): Promise<ComplianceReport[]> {
    return this.client.request<ComplianceReport[]>('GET', '/api/v1/compliance/reports', undefined, options);
  }

  /**
   * Get quick compliance statistics for a rolling window.
   *
   * @param params  - Stats parameters (number of days).
   * @param options - Optional request options.
   * @returns Compliance summary statistics.
   */
  async quickStats(params: QuickStatsParams, options?: RequestOptions): Promise<ComplianceSummary> {
    const query = buildQuery(params);
    return this.client.request<ComplianceSummary>('GET', `/api/v1/compliance/stats${query}`, undefined, options);
  }
}
