/**
 * Example: Retry Patterns with Vienna OS SDK
 *
 * Demonstrates robust error handling with exponential backoff,
 * classification of retryable vs permanent errors, and circuit
 * breaker patterns for production integrations.
 */

import { ViennaClient } from '../src';
import { ViennaError, AuthError } from '../src/errors';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'my-agent',
  apiKey: process.env.VIENNA_API_KEY,
  timeout: 15000,
});

// ─── Retry Configuration ────────────────────────────────────────

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: [
    'TIMEOUT',
    'NETWORK_ERROR',
    'REQUEST_FAILED', // 5xx errors
  ],
};

// Errors that should NEVER be retried
const PERMANENT_ERRORS = new Set([
  'UNAUTHORIZED',       // Bad API key — retrying won't help
  'INTENT_REJECTED',    // Policy blocked — need to fix the intent
  'ACTION_FORBIDDEN',   // Warrant scope violation
  'QUOTA_EXCEEDED',     // Wait for quota reset
]);

// ─── Retry Helper ───────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponential = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
  const jitter = Math.random() * 0.3 * exponential;
  return Math.floor(exponential + jitter);
}

function isRetryable(error: unknown, config: RetryConfig): boolean {
  if (error instanceof AuthError) return false;
  if (error instanceof ViennaError) {
    if (PERMANENT_ERRORS.has(error.code)) return false;
    if (config.retryableErrors.includes(error.code)) return true;
    // Retry on 5xx status codes
    if (error.status && error.status >= 500) return true;
  }
  // Network errors are retryable
  if (error instanceof Error && error.message.includes('fetch')) return true;
  return false;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY,
  label: string = 'operation',
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error, config)) {
        console.error(`[${label}] Permanent error (not retrying):`, error);
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delayMs = calculateBackoff(attempt, config);
        console.warn(
          `[${label}] Attempt ${attempt + 1}/${config.maxRetries + 1} failed, ` +
          `retrying in ${delayMs}ms: ${error instanceof Error ? error.message : error}`
        );
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

// ─── Circuit Breaker ────────────────────────────────────────────

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeMs: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>, label: string = 'request'): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = 'half-open';
        console.log(`[CircuitBreaker] Half-open, allowing test request`);
      } else {
        throw new Error(`Circuit breaker OPEN — ${label} blocked until reset`);
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        console.log(`[CircuitBreaker] Closed (recovered)`);
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'open';
        console.error(`[CircuitBreaker] OPEN after ${this.failures} failures`);
      }
      throw error;
    }
  }
}

// ─── Usage Examples ─────────────────────────────────────────────

async function main() {
  const breaker = new CircuitBreaker(5, 60000);

  // Example 1: Simple retry
  console.log('--- Example 1: Submit with retry ---');
  try {
    const result = await withRetry(
      () => vienna.submitIntent({
        action: 'deploy',
        payload: { service: 'api-gateway', version: 'v2.5.0' },
      }),
      DEFAULT_RETRY,
      'deploy-intent',
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('All retries exhausted:', error);
  }

  // Example 2: Circuit breaker + retry
  console.log('\n--- Example 2: Circuit breaker + retry ---');
  try {
    const result = await breaker.execute(
      () => withRetry(
        () => vienna.submitIntent({
          action: 'restart_service',
          payload: { service: 'worker-pool' },
        }),
        { ...DEFAULT_RETRY, maxRetries: 2 },
        'restart-intent',
      ),
      'restart-service',
    );
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed:', error);
  }

  // Example 3: Handling specific error types
  console.log('\n--- Example 3: Error classification ---');
  try {
    await vienna.submitIntent({
      action: 'delete_production',
      payload: { database: 'main' },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error('Auth failed — check API key');
    } else if (error instanceof ViennaError) {
      switch (error.code) {
        case 'INTENT_REJECTED':
          console.log('Policy blocked this intent. Review policies.');
          break;
        case 'QUOTA_EXCEEDED':
          console.log('Quota exceeded. Wait for reset or upgrade plan.');
          break;
        default:
          console.log(`Vienna error [${error.code}]: ${error.message}`);
      }
    }
  }
}

main().catch(console.error);
