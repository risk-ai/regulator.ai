export class ViennaEventEmitter {
    constructor(options?: {});
    eventStream: any;
    enabled: boolean;
    maxBufferSize: any;
    buffer: any[];
    failureCount: number;
    maxFailures: any;
    circuitBreakerOpen: boolean;
    queueCapacity: any;
    queueWarningThreshold: any;
    queueCriticalThreshold: any;
    failureRateWarning: any;
    failureRateCritical: any;
    failureRateWindow: any;
    stallThresholdMs: any;
    alertStates: {
        queueDepth: string;
        failureRate: string;
        executionStall: string;
    };
    recentFailures: any[];
    recentExecutions: any[];
    /**
     * Connect to event stream
     *
     * @param {object} eventStream - ViennaEventStream instance
     */
    connect(eventStream: object): void;
    /**
     * Emit envelope lifecycle event
     *
     * @param {string} type - Event type (started|completed|failed|retried|timeout|blocked)
     * @param {object} data - Event payload
     */
    emitEnvelopeEvent(type: string, data: object): void;
    /**
     * Emit objective progress event
     *
     * @param {string} type - Event type (created|progress.updated|completed|failed)
     * @param {object} data - Event payload
     */
    emitObjectiveEvent(type: string, data: object): void;
    /**
     * Emit alert event
     *
     * @param {string} alertType - Alert type (queue.depth|execution.stall|failure.rate)
     * @param {object} data - Alert payload
     */
    emitAlert(alertType: string, data: object): void;
    /**
     * Phase 5A.3: Check and emit queue depth alerts (stateful)
     *
     * @param {number} queuedCount - Current queued count
     */
    checkQueueDepth(queuedCount: number): void;
    /**
     * Phase 5A.3: Record execution result for failure rate tracking
     *
     * @param {string} envelopeId - Envelope ID
     * @param {boolean} failed - Whether execution failed
     */
    recordExecutionResult(envelopeId: string, failed: boolean): void;
    /**
     * Phase 5A.3: Check and emit failure rate alerts (stateful)
     */
    checkFailureRate(): void;
    /**
     * Phase 5A.3: Check for execution stall
     *
     * @param {number} lastExecutionTime - Timestamp of last execution start
     * @param {number} queuedCount - Current queued count
     */
    checkExecutionStall(lastExecutionTime: number, queuedCount: number): void;
    /**
     * Get event severity based on type
     *
     * @param {string} type - Event type
     * @returns {string} Severity level
     */
    _getSeverity(type: string): string;
    /**
     * Internal emit with buffering and circuit breaker
     *
     * @param {object} event - Event object
     */
    _emit(event: object): void;
    /**
     * Flush buffered events
     */
    _flushBuffer(): void;
    /**
     * Get emitter status
     *
     * @returns {object} Status
     */
    getStatus(): object;
    /**
     * Phase 5A.3: Reset failure rate tracking (for testing)
     *
     * @internal
     */
    _resetFailureRateTracking(): void;
}
//# sourceMappingURL=event-emitter.d.ts.map