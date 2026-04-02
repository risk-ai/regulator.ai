/**
 * Adapter Resolver — Phase 4A
 * 
 * Resolves execution steps to the appropriate adapter based on adapter_config_id.
 * If adapter_config_id is set → HTTP adapter with credential injection.
 * If null → passthrough (existing behavior for native/internal actions).
 * 
 * Owner: Vienna (implementation)
 * Design: Aiden (Phase 4A spec)
 */

import { executeHttpRequest, type HttpAdapterRequest } from './handlers/http-adapter.js';
import { redactSecrets, type ResolvedSecretMap } from '../services/secretRedaction.js';

// ---- Types ----

export interface ExecutionStep {
  step_index: number;
  step_name: string;
  tier: string;
  action: {
    type: string;
    target?: string;
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout_ms?: number;
    expected_status?: number[];
  };
  params: Record<string, any>;
  adapter_id?: string;  // references adapter_configs.id
}

export interface StepResult {
  success: boolean;
  output: any;
  latency_ms: number;
  adapter_used: 'http' | 'passthrough' | 'none';
  error?: string;
}

/**
 * Execute a single step, resolving the adapter if configured.
 */
export async function resolveAndExecuteStep(
  tenantId: string,
  step: ExecutionStep,
): Promise<StepResult> {
  const startTime = Date.now();

  // If adapter_id is set, use HTTP adapter
  if (step.adapter_id) {
    try {
      const httpRequest: HttpAdapterRequest = {
        adapter_config_id: step.adapter_id,
        method: (step.action.method || step.params?.method || 'POST') as HttpAdapterRequest['method'],
        url: step.action.url || step.params?.url || '',
        headers: step.action.headers || step.params?.headers,
        body: step.action.body || step.params?.body,
        timeout_ms: step.action.timeout_ms || step.params?.timeout_ms,
        expected_status: step.action.expected_status || step.params?.expected_status,
      };

      if (!httpRequest.url) {
        return {
          success: false,
          output: null,
          latency_ms: Date.now() - startTime,
          adapter_used: 'http',
          error: 'No URL specified for HTTP adapter step',
        };
      }

      const result = await executeHttpRequest(tenantId, httpRequest);

      return {
        success: result.success,
        output: result,
        latency_ms: result.latency_ms,
        adapter_used: 'http',
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        output: null,
        latency_ms: Date.now() - startTime,
        adapter_used: 'http',
        error: error.message,
      };
    }
  }

  // No adapter configured — passthrough (existing behavior)
  return {
    success: true,
    output: `No adapter for tier "${step.tier}" — passthrough`,
    latency_ms: Date.now() - startTime,
    adapter_used: 'passthrough',
  };
}

/**
 * Execute all steps in sequence, respecting dependencies.
 * Returns array of step results (all redacted).
 */
export async function executeSteps(
  tenantId: string,
  steps: ExecutionStep[],
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const step of steps) {
    console.log(`[AdapterResolver] Executing step ${step.step_index}: ${step.step_name} (adapter: ${step.adapter_id || 'none'})`);
    
    const result = await resolveAndExecuteStep(tenantId, step);
    results.push(result);

    // Stop on failure (no subsequent steps)
    if (!result.success) {
      console.log(`[AdapterResolver] Step ${step.step_index} failed, stopping execution`);
      break;
    }
  }

  return results;
}
