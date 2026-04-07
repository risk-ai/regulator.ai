import type { ApiResponse } from './types.js';
import {
  ViennaError,
  ViennaAuthError,
  ViennaForbiddenError,
  ViennaNotFoundError,
  ViennaRateLimitError,
  ViennaValidationError,
  ViennaServerError,
} from './errors.js';

/** SDK version injected into request headers. */
export const SDK_VERSION = '0.1.0';

/** Default base URL for the Vienna OS API. */
export const DEFAULT_BASE_URL = 'https://console.regulator.ai';

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT = 30_000;

/** Default number of retries on transient errors. */
export const DEFAULT_RETRIES = 3;

/**
 * Sleep for a given number of milliseconds.
 * Returns a promise that resolves after the delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter.
 *
 * @param attempt - Zero-based retry attempt number.
 * @param baseMs  - Base delay in milliseconds (default 1000).
 * @returns Delay in milliseconds.
 */
export function backoffDelay(attempt: number, baseMs: number = 1000): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return Math.min(exponential + jitter, 30_000); // cap at 30s
}

/**
 * Determine whether an HTTP status code is retryable.
 */
export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Parse the standard Vienna API response envelope and throw typed errors on failure.
 *
 * @param response - The raw fetch Response object.
 * @returns The unwrapped `data` field from the envelope.
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throwHttpError(response.status, response.statusText, 'NON_JSON_ERROR');
    }
    return undefined as T;
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    const message = body.error ?? response.statusText ?? 'Unknown error';
    const code = body.code ?? 'UNKNOWN';
    throwHttpError(response.status, message, code, body.data);
  }

  return body.data as T;
}

/**
 * Throw the appropriate typed error based on HTTP status.
 */
function throwHttpError(status: number, message: string, code: string, details?: unknown): never {
  switch (status) {
    case 400:
      throw new ViennaValidationError(
        message,
        code,
        typeof details === 'object' && details !== null ? (details as Record<string, string>) : undefined,
        details,
      );
    case 401:
      throw new ViennaAuthError(message, code, details);
    case 403:
      throw new ViennaForbiddenError(message, code, details);
    case 404:
      throw new ViennaNotFoundError(message, code, details);
    case 429:
      throw new ViennaRateLimitError(message, 0, code, details);
    default:
      if (status >= 500) {
        throw new ViennaServerError(message, status, code, details);
      }
      throw new ViennaError(message, status, code, details);
  }
}

/**
 * Build a URL query string from an object, omitting undefined values.
 */
export function buildQuery(params: Record<string, unknown> | object): string {
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}
