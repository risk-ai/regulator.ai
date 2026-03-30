/**
 * Retry Policy
 *
 * Phase 4C: Implements retry logic with exponential backoff
 * for transient failures in envelope execution.
 */
const { FailureClassifier } = require('./failure-classifier');
class RetryPolicy {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000; // 1 second
        this.maxDelay = options.maxDelay || 60000; // 60 seconds
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.classifier = new FailureClassifier();
    }
    /**
     * Determine if envelope should be retried
     *
     * @param {object} envelope - Envelope that failed
     * @param {Error} error - Failure error
     * @param {number} currentRetryCount - Current retry attempts
     * @returns {object} { shouldRetry, reason, delayMs }
     */
    shouldRetry(envelope, error, currentRetryCount) {
        // Exhaust retry limit check
        if (currentRetryCount >= this.maxRetries) {
            return {
                shouldRetry: false,
                reason: 'retry_exhausted',
                maxRetries: this.maxRetries,
                currentRetries: currentRetryCount
            };
        }
        // Classify failure
        const classification = this.classifier.classify(error);
        // Permanent failures should not be retried
        if (classification.category === 'permanent') {
            return {
                shouldRetry: false,
                reason: 'permanent_failure',
                classification: classification.category,
                failureType: classification.type
            };
        }
        // Timeout failures should not be retried (already at DLQ)
        if (error.code === 'EXECUTION_TIMEOUT' || error.name === 'ExecutionTimeoutError') {
            return {
                shouldRetry: false,
                reason: 'execution_timeout',
                timeoutMs: error.timeoutMs,
                durationMs: error.durationMs
            };
        }
        // Transient failures should be retried
        const delayMs = this.calculateBackoff(currentRetryCount);
        return {
            shouldRetry: true,
            reason: 'transient_failure',
            classification: classification.category,
            failureType: classification.type,
            delayMs,
            retryAttempt: currentRetryCount + 1,
            maxRetries: this.maxRetries
        };
    }
    /**
     * Calculate exponential backoff delay
     *
     * Formula: min(baseDelay * (backoffMultiplier ^ retryCount), maxDelay)
     *
     * @param {number} retryCount - Current retry count
     * @returns {number} Delay in milliseconds
     */
    calculateBackoff(retryCount) {
        const delay = this.baseDelay * Math.pow(this.backoffMultiplier, retryCount);
        return Math.min(delay, this.maxDelay);
    }
    /**
     * Get retry schedule for given retry count
     *
     * @param {number} maxRetries - Optional override
     * @returns {Array<number>} Array of delays for each retry
     */
    getRetrySchedule(maxRetries = null) {
        const limit = maxRetries || this.maxRetries;
        const schedule = [];
        for (let i = 0; i < limit; i++) {
            schedule.push(this.calculateBackoff(i));
        }
        return schedule;
    }
    /**
     * Get policy configuration
     *
     * @returns {object} Policy config
     */
    getConfig() {
        return {
            maxRetries: this.maxRetries,
            baseDelay: this.baseDelay,
            maxDelay: this.maxDelay,
            backoffMultiplier: this.backoffMultiplier,
            schedule: this.getRetrySchedule()
        };
    }
}
module.exports = { RetryPolicy };
//# sourceMappingURL=retry-policy.js.map