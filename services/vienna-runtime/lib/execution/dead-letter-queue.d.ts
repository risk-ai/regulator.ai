export class DeadLetterQueue {
    constructor(options?: {});
    dlqFile: any;
    entries: Map<any, any>;
    loaded: boolean;
    /**
     * Initialize DLQ (load from disk)
     */
    initialize(): Promise<void>;
    /**
     * Add envelope to dead letter queue
     *
     * @param {object} params - Dead letter params
     * @returns {Promise<object>} DLQ entry
     */
    deadLetter(params: object): Promise<object>;
    /**
     * Requeue dead-lettered envelope (operator action)
     *
     * @param {string} envelopeId - Envelope to requeue
     * @returns {Promise<object>} Updated entry and envelope
     */
    requeue(envelopeId: string): Promise<object>;
    /**
     * Cancel dead-lettered envelope (operator action)
     *
     * Marks envelope as permanently cancelled.
     * Entry remains for audit history but no further execution allowed.
     *
     * @param {string} envelopeId - Envelope to cancel
     * @returns {Promise<object>} Updated entry
     */
    cancel(envelopeId: string): Promise<object>;
    /**
     * Get dead letter entries
     *
     * @param {object} filters - Optional filters
     * @returns {Array<object>} Matching entries
     */
    getEntries(filters?: object): Array<object>;
    /**
     * Get single entry
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {object|null} Entry or null
     */
    getEntry(envelopeId: string): object | null;
    /**
     * Get statistics
     *
     * @returns {object} DLQ stats
     */
    getStats(): object;
    /**
     * Load entries from disk
     */
    _loadFromDisk(): Promise<void>;
    /**
     * Append entry to disk
     */
    _appendToDisk(entry: any): Promise<void>;
    /**
     * Clear completed entries (requeued or cancelled > 30 days old)
     *
     * For periodic maintenance.
     */
    clearOld(daysOld?: number): Promise<number>;
}
export namespace DLQState {
    let DEAD_LETTERED: string;
    let REQUEUED: string;
    let CANCELLED: string;
}
export namespace DLQReason {
    let PERMANENT_FAILURE: string;
    let RETRY_EXHAUSTED: string;
    let OPERATOR_REJECTED: string;
    let INTEGRITY_BLOCKED: string;
    let EXECUTION_TIMEOUT: string;
    let CRASH_RECOVERY_EXHAUSTED: string;
}
//# sourceMappingURL=dead-letter-queue.d.ts.map