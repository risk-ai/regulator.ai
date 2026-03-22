export class RetryPolicy {
    constructor(options?: {});
    maxRetries: any;
    baseDelay: any;
    maxDelay: any;
    backoffMultiplier: any;
    classifier: FailureClassifier;
    /**
     * Determine if envelope should be retried
     *
     * @param {object} envelope - Envelope that failed
     * @param {Error} error - Failure error
     * @param {number} currentRetryCount - Current retry attempts
     * @returns {object} { shouldRetry, reason, delayMs }
     */
    shouldRetry(envelope: object, error: Error, currentRetryCount: number): object;
    /**
     * Calculate exponential backoff delay
     *
     * Formula: min(baseDelay * (backoffMultiplier ^ retryCount), maxDelay)
     *
     * @param {number} retryCount - Current retry count
     * @returns {number} Delay in milliseconds
     */
    calculateBackoff(retryCount: number): number;
    /**
     * Get retry schedule for given retry count
     *
     * @param {number} maxRetries - Optional override
     * @returns {Array<number>} Array of delays for each retry
     */
    getRetrySchedule(maxRetries?: number): Array<number>;
    /**
     * Get policy configuration
     *
     * @returns {object} Policy config
     */
    getConfig(): object;
}
import { FailureClassifier } from "./failure-classifier";
//# sourceMappingURL=retry-policy.d.ts.map