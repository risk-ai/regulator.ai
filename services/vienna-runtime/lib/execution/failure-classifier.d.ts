export class FailureClassifier {
    /**
     * Classify failure
     *
     * @param {Error} error - Error to classify
     * @returns {object} { category: string, retryable: boolean, reason: string }
     */
    classify(error: Error): object;
    /**
     * Compute retry delay with exponential backoff
     *
     * @param {number} attempt - Retry attempt number (0-based)
     * @param {object} options - Backoff options
     * @returns {number} Delay in milliseconds
     */
    computeRetryDelay(attempt: number, options?: object): number;
}
export namespace FailureCategory {
    let TRANSIENT: string;
    let PERMANENT: string;
}
//# sourceMappingURL=failure-classifier.d.ts.map