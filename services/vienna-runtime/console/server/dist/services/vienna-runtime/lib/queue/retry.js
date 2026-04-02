/**
 * Phase 16.3 — Retry Calculator
 *
 * Compute next retry time with bounded attempts and backoff.
 */
export function computeNextRetryAt(now, retry, policy) {
    const nextAttempt = retry.attempt_count + 1;
    // Exhausted max attempts
    if (nextAttempt > policy.max_attempts) {
        return undefined;
    }
    // Calculate delay based on strategy
    const delay = policy.strategy === "fixed"
        ? policy.backoff_ms
        : policy.backoff_ms * Math.pow(2, retry.attempt_count);
    return new Date(now.getTime() + delay).toISOString();
}
export function shouldRetry(retry, policy) {
    return retry.attempt_count < policy.max_attempts;
}
export function incrementRetryAttempt(retry, error) {
    return {
        attempt_count: retry.attempt_count + 1,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: retry.next_retry_at,
        last_error_code: error?.code,
        last_error_message: error?.message,
    };
}
//# sourceMappingURL=retry.js.map