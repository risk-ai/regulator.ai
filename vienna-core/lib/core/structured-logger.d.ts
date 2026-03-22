export class StructuredLogger {
    constructor(options?: {});
    enabled: boolean;
    minLevel: any;
    persistEnabled: boolean;
    persistPath: any;
    maxBufferSize: any;
    LEVELS: {
        debug: number;
        info: number;
        warn: number;
        error: number;
    };
    buffer: any[];
    logCounter: number;
    /**
     * Log an event
     *
     * @param {string} event - Event name (e.g., execution.started)
     * @param {object} data - Event data
     * @param {object} options - Log options
     */
    log(event: string, data?: object, options?: object): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log execution started
     */
    logExecutionStarted(envelopeId: any, objectiveId: any, provider: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log execution completed
     */
    logExecutionCompleted(envelopeId: any, objectiveId: any, provider: any, durationMs: any, result?: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log execution failed
     */
    logExecutionFailed(envelopeId: any, objectiveId: any, provider: any, durationMs: any, error: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log retry scheduled
     */
    logRetryScheduled(envelopeId: any, objectiveId: any, reason: any, retryCount: any, delayMs: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log provider failure
     */
    logProviderFailure(provider: any, error: any, context?: {}): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log provider recovery
     */
    logProviderRecovered(provider: any, context?: {}): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log objective completed
     */
    logObjectiveCompleted(objectiveId: any, totalEnvelopes: any, failedCount: any, durationMs: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log objective failed
     */
    logObjectiveFailed(objectiveId: any, reason: any, error: any): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log runtime alert
     */
    logRuntimeAlert(alertType: any, data?: {}): {
        log_id: string;
        timestamp: string;
        event: string;
        level: any;
        objective_id: any;
        envelope_id: any;
        provider: any;
        agent_id: any;
        status: any;
        duration_ms: any;
        error: any;
        metadata: any;
        source: any;
    };
    /**
     * Log to console
     */
    _logToConsole(entry: any): void;
    /**
     * Buffer entry for querying (and optionally persistence)
     */
    _bufferEntry(entry: any): void;
    /**
     * Flush buffered logs to disk
     */
    flush(): Promise<void>;
    /**
     * Get recent logs from buffer or disk
     */
    getRecent(count?: number): Promise<any[]>;
    /**
     * Query logs by criteria
     */
    query(criteria?: {}): Promise<any[]>;
    /**
     * Get logger statistics
     */
    getStats(): {
        enabled: boolean;
        persist_enabled: boolean;
        persist_path: any;
        min_level: any;
        buffer_size: number;
        max_buffer_size: any;
        total_logs_created: number;
    };
}
//# sourceMappingURL=structured-logger.d.ts.map