export class ReplayLog {
    constructor(options?: {});
    replayFile: any;
    initialized: boolean;
    rotationConfig: any;
    lastSizeCheck: number;
    sizeCheckInterval: number;
    /**
     * Initialize replay log
     */
    initialize(): Promise<void>;
    /**
     * Check log size and rotate if needed
     */
    _checkAndRotate(): Promise<void>;
    /**
     * Rotate log file
     */
    _rotate(): Promise<void>;
    /**
     * Prune old rotated files beyond maxFiles limit
     */
    _pruneOldFiles(): Promise<void>;
    /**
     * Emit event to replay log
     *
     * @param {object} event - Event data
     */
    emit(event: object): Promise<void>;
    /**
     * Query replay log with streaming support for large files
     *
     * CRITICAL: This method avoids loading entire file into memory.
     * For large files, uses pagination with offset/limit or reads last N lines.
     *
     * @param {object} filters - Query filters
     * @returns {Promise<object>} {events, total, has_more, offset}
     */
    query(filters?: object): Promise<object>;
    /**
     * Query small files entirely in memory
     */
    _queryInMemory(filters?: {}, offset?: number, limit?: number): Promise<{
        events: any[];
        total: number;
        has_more: boolean;
        offset: number;
    }>;
    /**
     * Query large files using streaming to avoid memory spike
     *
     * For large files: reads sequentially, filters, counts total, then
     * returns paginated slice without loading entire file into memory.
     */
    _queryStreaming(filters?: {}, offset?: number, limit?: number): Promise<{
        events: any[];
        total: number;
        has_more: boolean;
        offset: number;
    }>;
    /**
     * Get causal chain for envelope
     *
     * Returns ancestry tree by following parent_envelope_id.
     *
     * @param {string} envelopeId - Envelope to trace
     * @returns {Promise<array>} Chain of events
     */
    getCausalChain(envelopeId: string): Promise<any[]>;
    /**
     * Get all events for objective
     *
     * @param {string} objectiveId - Objective identifier
     * @returns {Promise<array>} All events
     */
    getObjectiveEvents(objectiveId: string): Promise<any[]>;
    /**
     * Get execution metrics
     *
     * @param {object} options - Metric options
     * @returns {Promise<object>} Metrics summary
     */
    getMetrics(options?: object): Promise<object>;
    /**
     * Generate event ID
     */
    _generateEventId(): string;
}
export namespace EventType {
    let ENVELOPE_PROPOSED: string;
    let ENVELOPE_QUEUED: string;
    let ENVELOPE_EXECUTING: string;
    let ENVELOPE_COMPLETED: string;
    let ENVELOPE_FAILED: string;
    let ENVELOPE_BLOCKED: string;
    let RECURSION_REJECTED: string;
}
//# sourceMappingURL=replay-log.d.ts.map