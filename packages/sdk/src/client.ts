import type { ViennaConfig, RequestOptions } from './types.js';
import { ViennaRateLimitError } from './errors.js';
import {
  SDK_VERSION,
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_RETRIES,
  sleep,
  backoffDelay,
  isRetryable,
  parseResponse,
} from './utils.js';
import { IntentModule } from './intent.js';
import { PoliciesModule } from './policies.js';
import { FleetModule } from './fleet.js';
import { ApprovalsModule } from './approvals.js';
import { IntegrationsModule } from './integrations.js';
import { ComplianceModule } from './compliance.js';

/**
 * Main client for the Vienna OS API.
 *
 * @example
 * ```typescript
 * import { ViennaClient } from '@vienna/sdk';
 *
 * const vienna = new ViennaClient({ apiKey: 'vna_your_api_key' });
 * const result = await vienna.intent.submit({ action: 'deploy', source: 'ci-bot', payload: {} });
 * ```
 */
export class ViennaClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly onError?: (error: Error) => void;

  /** Intent submission and status. */
  readonly intent: IntentModule;
  /** Policy management. */
  readonly policies: PoliciesModule;
  /** Fleet and agent management. */
  readonly fleet: FleetModule;
  /** Approval workflows. */
  readonly approvals: ApprovalsModule;
  /** External integrations. */
  readonly integrations: IntegrationsModule;
  /** Compliance reporting. */
  readonly compliance: ComplianceModule;

  constructor(config: ViennaConfig) {
    if (!config.apiKey) {
      throw new Error('Vienna SDK: apiKey is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? DEFAULT_RETRIES;
    this.onError = config.onError;

    // Initialize modules
    this.intent = new IntentModule(this);
    this.policies = new PoliciesModule(this);
    this.fleet = new FleetModule(this);
    this.approvals = new ApprovalsModule(this);
    this.integrations = new IntegrationsModule(this);
    this.compliance = new ComplianceModule(this);
  }

  /**
   * Make an authenticated request to the Vienna API.
   *
   * @param method  - HTTP method.
   * @param path    - API path (e.g. `/api/v1/intents`).
   * @param body    - Optional JSON request body.
   * @param options - Per-request options (signal, timeout override).
   * @returns Parsed response data.
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const requestTimeout = options?.timeout ?? this.timeout;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      // Merge external signal with timeout
      if (options?.signal) {
        if (options.signal.aborted) {
          clearTimeout(timeoutId);
          controller.abort();
        } else {
          options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }

      try {
        const headers: Record<string, string> = {
          'X-Vienna-Api-Key': this.apiKey,
          'X-Vienna-SDK-Version': SDK_VERSION,
          'Accept': 'application/json',
        };

        if (body !== undefined) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If retryable and we have retries left, back off
        if (isRetryable(response.status) && attempt < this.retries) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : backoffDelay(attempt);
          await sleep(delay);
          continue;
        }

        return await parseResponse<T>(response);
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort or non-retryable errors
        const isAbort = lastError.name === 'AbortError';
        const isRateLimit = lastError instanceof ViennaRateLimitError;

        if (isAbort || (!isRateLimit && attempt >= this.retries)) {
          this.onError?.(lastError);
          throw lastError;
        }

        if (attempt < this.retries) {
          await sleep(backoffDelay(attempt));
        }
      }
    }

    // Should never reach here, but just in case
    const finalError = lastError ?? new Error('Vienna SDK: request failed after retries');
    this.onError?.(finalError);
    throw finalError;
  }
}
