/**
 * Phase 16.3 — Retry Calculator
 *
 * Compute next retry time with bounded attempts and backoff.
 */
import { RetryMetadata, RetryPolicy } from "./types";
export declare function computeNextRetryAt(now: Date, retry: RetryMetadata, policy: RetryPolicy): string | undefined;
export declare function shouldRetry(retry: RetryMetadata, policy: RetryPolicy): boolean;
export declare function incrementRetryAttempt(retry: RetryMetadata, error?: {
    code?: string;
    message?: string;
}): RetryMetadata;
//# sourceMappingURL=retry.d.ts.map