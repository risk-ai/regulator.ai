/**
 * HTTP Adapter — Phase 4A
 * 
 * Managed execution adapter for external HTTP calls.
 * Resolves credentials from adapter_configs, injects auth, makes request,
 * redacts response before returning.
 * 
 * Owner: Vienna (implementation)
 * Design: Aiden (Phase 4A spec)
 * 
 * SECURITY:
 * - Credentials resolved in memory only via credentialService.resolve()
 * - Auth injected into request headers in memory
 * - Response redacted before return (caller persists redacted version)
 * - No secrets in logs, timeline, or any persisted surface
 */

import { resolveCredentials, type ResolvedCredentials } from '../../services/credentialService.js';
import { redactSecrets, type ResolvedSecretMap } from '../../services/secretRedaction.js';
import type { ExecutionHandler, ExecutionContext, ExecutionResult } from '../types.js';

// ---- Types ----

export interface HttpAdapterRequest {
  adapter_config_id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout_ms?: number;           // default: 30000, max: 120000
  expected_status?: number[];    // default: [200, 201, 202, 204]
}

export interface HttpAdapterResponse {
  success: boolean;
  status_code: number;
  headers: Record<string, string>;
  body: any;
  latency_ms: number;
  error?: string;
  adapter_config_id: string;
  auth_mode: string;
}

// ---- Constants ----

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_EXPECTED_STATUS = [200, 201, 202, 204];
const MAX_RESPONSE_BODY_BYTES = 1_048_576; // 1MB

// ---- Auth Injection (in-memory only) ----

function injectAuth(
  headers: Record<string, string>,
  credentials: ResolvedCredentials,
): Record<string, string> {
  const result = { ...headers };

  switch (credentials.auth_mode) {
    case 'bearer':
      result['Authorization'] = `Bearer ${credentials.secret}`;
      break;

    case 'api_key_header': {
      // Use the first custom header from adapter config, or default to X-API-Key
      const headerName = Object.keys(credentials.headers).find(
        h => h.toLowerCase() !== 'content-type' && h.toLowerCase() !== 'accept'
      ) || 'X-API-Key';
      result[headerName] = credentials.secret;
      break;
    }

    case 'basic': {
      // Secret format: "username:password"
      const encoded = Buffer.from(credentials.secret).toString('base64');
      result['Authorization'] = `Basic ${encoded}`;
      break;
    }

    case 'hmac': {
      // HMAC-SHA256 of body
      const crypto = require('crypto');
      const bodyStr = typeof headers['_body'] === 'string' 
        ? headers['_body'] 
        : JSON.stringify(headers['_body'] || '');
      const sig = crypto.createHmac('sha256', credentials.secret)
        .update(bodyStr)
        .digest('hex');
      result['X-Signature'] = sig;
      result['X-Signature-Algorithm'] = 'hmac-sha256';
      break;
    }

    default:
      console.warn(`[HttpAdapter] Unknown auth_mode: ${credentials.auth_mode}, no auth injected`);
  }

  return result;
}

// ---- Adapter ----

/**
 * Execute an HTTP request with credential injection.
 * Returns redacted response suitable for persistence.
 */
export async function executeHttpRequest(
  tenantId: string,
  request: HttpAdapterRequest,
): Promise<HttpAdapterResponse> {
  const startTime = Date.now();
  let resolvedCreds: ResolvedCredentials | null = null;
  let secretMap: ResolvedSecretMap = {};

  try {
    // 1. Resolve credentials
    resolvedCreds = await resolveCredentials(tenantId, request.adapter_config_id);
    
    // Build secret map for redaction
    secretMap = {
      [resolvedCreds.secret]: resolvedCreds.config_id,
    };

    // 2. Build request
    const timeout = Math.min(request.timeout_ms || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const expectedStatus = request.expected_status || DEFAULT_EXPECTED_STATUS;

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Vienna-OS/1.0',
      ...request.headers,
    };

    // 3. Inject auth (in-memory only)
    headers = injectAuth(headers, resolvedCreds);

    // 4. Make request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let fetchResponse: Response;
    try {
      fetchResponse = await fetch(request.url, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Date.now() - startTime;

    // 5. Read response
    const responseHeaders: Record<string, string> = {};
    fetchResponse.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: any;
    const contentType = fetchResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await fetchResponse.json();
    } else {
      const text = await fetchResponse.text();
      responseBody = text.length > MAX_RESPONSE_BODY_BYTES 
        ? text.substring(0, MAX_RESPONSE_BODY_BYTES) + '...[truncated]'
        : text;
    }

    const success = expectedStatus.includes(fetchResponse.status);

    // 6. Build response and REDACT before returning
    const rawResponse: HttpAdapterResponse = {
      success,
      status_code: fetchResponse.status,
      headers: responseHeaders,
      body: responseBody,
      latency_ms: latencyMs,
      adapter_config_id: request.adapter_config_id,
      auth_mode: resolvedCreds.auth_mode,
      error: success ? undefined : `Unexpected status ${fetchResponse.status}`,
    };

    // REDACT — this is the critical security step
    return redactSecrets(rawResponse, secretMap) as HttpAdapterResponse;

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    const errorResponse: HttpAdapterResponse = {
      success: false,
      status_code: 0,
      headers: {},
      body: null,
      latency_ms: latencyMs,
      adapter_config_id: request.adapter_config_id,
      auth_mode: resolvedCreds?.auth_mode || 'unknown',
      error: error.name === 'AbortError' 
        ? `Request timed out after ${request.timeout_ms || DEFAULT_TIMEOUT_MS}ms`
        : error.message,
    };

    // Redact error messages too (they might echo auth details)
    return redactSecrets(errorResponse, secretMap) as HttpAdapterResponse;
  }
}

// ---- Handler Registration ----

/**
 * HTTP Adapter as an ExecutionHandler for the handler registry.
 */
export const httpAdapterHandler: ExecutionHandler = {
  name: 'http_request',
  description: 'Execute an authenticated HTTP request against an external endpoint',

  validate(payload: any): boolean {
    if (!payload?.adapter_config_id) return false;
    if (!payload?.method) return false;
    if (!payload?.url) return false;
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(payload.method)) return false;
    try {
      new URL(payload.url);
    } catch {
      return false;
    }
    return true;
  },

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const result = await executeHttpRequest(context.tenantId, context.payload as HttpAdapterRequest);
      return {
        success: result.success,
        data: result,
        executionTimeMs: Date.now() - startTime,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
