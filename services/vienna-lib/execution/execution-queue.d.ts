export class ExecutionQueue {
    constructor(options?: {});
    queueFile: any;
    queue: Map<any, any>;
    fifo: any[];
    loaded: boolean;
    maxQueueSize: any;
    backpressureMode: any;
    backpressureWaitTimeout: any;
    executionAttempts: Map<any, any>;
    executionResults: Map<any, any>;
    /**
     * Initialize queue (load from disk)
     */
    initialize(): Promise<void>;
    /**
     * Enqueue envelope for execution
     *
     * @param {object} envelope - Envelope to enqueue
     * @returns {string} queue_id
     */
    enqueue(envelope: object): string;
    /**
     * Get next envelope to execute (FIFO)
     *
     * @returns {object|null} Next envelope or null if queue empty
     */
    next(): object | null;
    /**
     * Mark envelope as executing
     */
    markExecuting(envelopeId: any): Promise<void>;
    /**
     * Mark envelope as completed
     */
    markCompleted(envelopeId: any, result: any): Promise<void>;
    /**
     * Mark envelope as failed
     */
    markFailed(envelopeId: any, error: any): Promise<void>;
    /**
     * Mark envelope as blocked (recursion guard rejection)
     */
    markBlocked(envelopeId: any, reason: any): Promise<void>;
    /**
     * Get queue entry by envelope ID
     */
    getEntry(envelopeId: any): any;
    /**
     * Get all entries in queue
     */
    getAllEntries(): any[];
    /**
     * Get entries by state
     */
    getEntriesByState(state: any): any[];
    /**
     * Get queue statistics
     */
    getStats(): {
        total: number;
        queued: number;
        executing: number;
        completed: number;
        failed: number;
        blocked: number;
    };
    /**
     * Remove envelope from queue (for dead lettering)
     *
     * @param {string} envelopeId - Envelope to remove
     */
    remove(envelopeId: string): Promise<void>;
    /**
     * Clear completed entries (housekeeping)
     */
    clearCompleted(): Promise<void>;
    /**
     * Persist queue entry to disk
     */
    _persist(entry: any): Promise<void>;
    /**
     * Load queue from disk
     */
    _loadFromDisk(): Promise<void>;
    /**
     * Rebuild queue file (remove duplicates and completed entries)
     */
    _rebuildQueueFile(): Promise<void>;
    /**
     * Generate queue ID
     */
    _generateQueueId(): string;
    /**
     * Phase 4B: Check backpressure condition
     *
     * @returns {object} { allowed, reason, queueSize, maxSize }
     * @private
     */
    private _checkBackpressure;
    /**
     * Phase 4B: Wait for queue space (with timeout)
     *
     * @returns {Promise<void>}
     * @private
     */
    private _waitForQueueSpace;
    /**
     * Phase 4D: Record execution attempt
     *
     * @param {string} envelopeId - Envelope ID
     * @param {string} event - Event type ('enqueued' | 'started' | 'completed')
     * @private
     */
    private _recordExecutionAttempt;
    /**
     * Phase 4D: Get execution attempts for envelope
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {Array<object>} Attempt history
     */
    getExecutionAttempts(envelopeId: string): Array<object>;
    /**
     * Phase 4D: Check if envelope already executed successfully
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {boolean} True if already executed
     */
    isAlreadyExecuted(envelopeId: string): boolean;
    /**
     * Phase 4D: Get cached execution result (idempotency)
     *
     * @param {string} envelopeId - Envelope ID
     * @returns {object|null} Cached result
     */
    getCachedResult(envelopeId: string): object | null;
}
export namespace QueueState {
    let QUEUED: string;
    let EXECUTING: string;
    let COMPLETED: string;
    let FAILED: string;
    let BLOCKED: string;
}
/**
 * Phase 4B: Backpressure error
 */
export class BackpressureError extends Error {
    constructor(message: any, queueSize: any, maxSize: any);
    queueSize: any;
    maxSize: any;
    code: string;
}
//# sourceMappingURL=execution-queue.d.ts.map