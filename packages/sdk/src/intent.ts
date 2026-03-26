import type { ViennaClient } from './client.js';
import type {
  IntentRequest,
  IntentResult,
  IntentStatusResponse,
  IntentSimulationResult,
  RequestOptions,
} from './types.js';

/**
 * Module for submitting and managing agent intents through the governance pipeline.
 *
 * @example
 * ```typescript
 * const result = await vienna.intent.submit({
 *   action: 'wire_transfer',
 *   source: 'billing-bot',
 *   payload: { amount: 75000, currency: 'USD' },
 * });
 * ```
 */
export class IntentModule {
  constructor(private readonly client: ViennaClient) {}

  /**
   * Submit an agent intent for governance evaluation and execution.
   *
   * @param intent  - The intent request describing the action.
   * @param options - Optional request options (signal, timeout).
   * @returns The intent result including status, risk tier, and policy matches.
   */
  async submit(intent: IntentRequest, options?: RequestOptions): Promise<IntentResult> {
    return this.client.request<IntentResult>('POST', '/api/v1/intents', intent, options);
  }

  /**
   * Check the current status of a previously submitted intent.
   *
   * @param intentId - The intent identifier (e.g. `int-abc123`).
   * @param options  - Optional request options.
   * @returns Full intent status including audit trail references.
   */
  async status(intentId: string, options?: RequestOptions): Promise<IntentStatusResponse> {
    return this.client.request<IntentStatusResponse>('GET', `/api/v1/intents/${encodeURIComponent(intentId)}`, undefined, options);
  }

  /**
   * Simulate an intent without executing it (dry-run).
   * Useful for testing policy configurations and understanding governance outcomes.
   *
   * @param intent  - The intent to simulate.
   * @param options - Optional request options.
   * @returns Simulation result showing what would happen.
   */
  async simulate(intent: IntentRequest, options?: RequestOptions): Promise<IntentSimulationResult> {
    return this.client.request<IntentSimulationResult>('POST', '/api/v1/intents/simulate', intent, options);
  }
}
