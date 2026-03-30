/**
 * Vienna Event Emitter
 *
 * Phase 5A: Execution Event Stream
 *
 * Emits runtime events to SSE stream for UI observability.
 * Non-blocking, fire-and-forget design with circuit breaker.
 *
 * Event types:
 * - execution.started
 * - execution.completed
 * - execution.failed
 * - execution.retried
 * - execution.timeout
 * - execution.blocked
 * - objective.created
 * - objective.progress.updated
 * - objective.completed
 * - objective.failed
 * - alert.queue.depth
 * - alert.execution.stall
 * - alert.failure.rate
 */
let eventCounter = 0;
/**
 * Generate unique event ID
 */
function generateEventId() {
    const timestamp = Date.now();
    const counter = (eventCounter++).toString(36);
    return `evt_${timestamp}_${counter}`;
}
class ViennaEventEmitter {
    constructor(options = {}) {
        this.eventStream = null;
        this.enabled = options.enabled !== false;
        this.maxBufferSize = options.maxBufferSize || 100;
        this.buffer = [];
        this.failureCount = 0;
        this.maxFailures = options.maxFailures || 10;
        this.circuitBreakerOpen = false;
        this.queueCapacity = options.queueCapacity || 1000;
        // Alert thresholds (configurable)
        this.queueWarningThreshold = options.queueWarningThreshold || 0.7;
        this.queueCriticalThreshold = options.queueCriticalThreshold || 0.9;
        this.failureRateWarning = options.failureRateWarning || 0.05;
        this.failureRateCritical = options.failureRateCritical || 0.10;
        this.failureRateWindow = options.failureRateWindow || 300000; // 5 minutes
        this.stallThresholdMs = options.stallThresholdMs || 60000; // 1 minute
        // Phase 5A.3: Stateful alert tracking (deduplication)
        this.alertStates = {
            queueDepth: 'normal', // normal | warning | critical
            failureRate: 'normal', // normal | warning | critical
            executionStall: 'normal' // normal | stalled
        };
        // Phase 5A.3: Failure rate tracking
        this.recentFailures = []; // Array of { timestamp, envelope_id }
        this.recentExecutions = []; // Array of { timestamp, envelope_id }
    }
    /**
     * Connect to event stream
     *
     * @param {object} eventStream - ViennaEventStream instance
     */
    connect(eventStream) {
        this.eventStream = eventStream;
        console.log('[ViennaEventEmitter] Connected to event stream');
        // Flush buffered events
        this._flushBuffer();
    }
    /**
     * Emit envelope lifecycle event
     *
     * @param {string} type - Event type (started|completed|failed|retried|timeout|blocked)
     * @param {object} data - Event payload
     */
    emitEnvelopeEvent(type, data) {
        if (!this.enabled || this.circuitBreakerOpen) {
            return;
        }
        const eventType = `execution.${type}`;
        this._emit({
            event_id: generateEventId(),
            event_type: eventType,
            timestamp: new Date().toISOString(),
            envelope_id: data.envelope_id,
            objective_id: data.objective_id || null,
            severity: this._getSeverity(type),
            payload: data
        });
    }
    /**
     * Emit objective progress event
     *
     * @param {string} type - Event type (created|progress.updated|completed|failed)
     * @param {object} data - Event payload
     */
    emitObjectiveEvent(type, data) {
        if (!this.enabled || this.circuitBreakerOpen) {
            return;
        }
        const eventType = `objective.${type}`;
        this._emit({
            event_id: generateEventId(),
            event_type: eventType,
            timestamp: new Date().toISOString(),
            envelope_id: null,
            objective_id: data.objective_id,
            severity: this._getSeverity(type),
            payload: data
        });
    }
    /**
     * Emit alert event
     *
     * @param {string} alertType - Alert type (queue.depth|execution.stall|failure.rate)
     * @param {object} data - Alert payload
     */
    emitAlert(alertType, data) {
        if (!this.enabled || this.circuitBreakerOpen) {
            return;
        }
        const eventType = `alert.${alertType}`;
        this._emit({
            event_id: generateEventId(),
            event_type: eventType,
            timestamp: new Date().toISOString(),
            envelope_id: null,
            objective_id: null,
            severity: data.severity || 'warning',
            payload: data
        });
    }
    /**
     * Phase 5A.3: Check and emit queue depth alerts (stateful)
     *
     * @param {number} queuedCount - Current queued count
     */
    checkQueueDepth(queuedCount) {
        const warningThreshold = Math.floor(this.queueCapacity * this.queueWarningThreshold);
        const criticalThreshold = Math.floor(this.queueCapacity * this.queueCriticalThreshold);
        const utilization = queuedCount / this.queueCapacity;
        let newState = 'normal';
        if (queuedCount >= criticalThreshold) {
            newState = 'critical';
        }
        else if (queuedCount >= warningThreshold) {
            newState = 'warning';
        }
        const oldState = this.alertStates.queueDepth;
        // Only emit if state changed
        if (newState !== oldState) {
            this.alertStates.queueDepth = newState;
            if (newState === 'critical') {
                this.emitAlert('queue.depth.critical', {
                    severity: 'critical',
                    current_depth: queuedCount,
                    capacity: this.queueCapacity,
                    threshold: criticalThreshold,
                    utilization,
                    previous_state: oldState
                });
            }
            else if (newState === 'warning') {
                this.emitAlert('queue.depth.warning', {
                    severity: 'warning',
                    current_depth: queuedCount,
                    capacity: this.queueCapacity,
                    threshold: warningThreshold,
                    utilization,
                    previous_state: oldState
                });
            }
            else if (newState === 'normal' && oldState !== 'normal') {
                // Recovery event
                this.emitAlert('queue.depth.recovered', {
                    severity: 'info',
                    current_depth: queuedCount,
                    capacity: this.queueCapacity,
                    utilization,
                    previous_state: oldState
                });
            }
        }
    }
    /**
     * Phase 5A.3: Record execution result for failure rate tracking
     *
     * @param {string} envelopeId - Envelope ID
     * @param {boolean} failed - Whether execution failed
     */
    recordExecutionResult(envelopeId, failed) {
        const now = Date.now();
        // Clean old entries outside window
        this.recentExecutions = this.recentExecutions.filter(e => now - e.timestamp < this.failureRateWindow);
        this.recentFailures = this.recentFailures.filter(e => now - e.timestamp < this.failureRateWindow);
        // Record new execution
        this.recentExecutions.push({ timestamp: now, envelope_id: envelopeId });
        if (failed) {
            this.recentFailures.push({ timestamp: now, envelope_id: envelopeId });
        }
        // Check failure rate
        this.checkFailureRate();
    }
    /**
     * Phase 5A.3: Check and emit failure rate alerts (stateful)
     */
    checkFailureRate() {
        // Require minimum sample size to avoid spurious alerts
        const minSampleSize = 20;
        if (this.recentExecutions.length < minSampleSize) {
            return; // Not enough data yet
        }
        const failureRate = this.recentFailures.length / this.recentExecutions.length;
        let newState = 'normal';
        if (failureRate >= this.failureRateCritical) {
            newState = 'critical';
        }
        else if (failureRate >= this.failureRateWarning) {
            newState = 'warning';
        }
        const oldState = this.alertStates.failureRate;
        // Only emit if state changed
        if (newState !== oldState) {
            this.alertStates.failureRate = newState;
            if (newState === 'critical') {
                this.emitAlert('failure.rate.critical', {
                    severity: 'critical',
                    failure_rate: failureRate,
                    failures: this.recentFailures.length,
                    executions: this.recentExecutions.length,
                    window_ms: this.failureRateWindow,
                    threshold: this.failureRateCritical,
                    previous_state: oldState
                });
            }
            else if (newState === 'warning') {
                this.emitAlert('failure.rate.warning', {
                    severity: 'warning',
                    failure_rate: failureRate,
                    failures: this.recentFailures.length,
                    executions: this.recentExecutions.length,
                    window_ms: this.failureRateWindow,
                    threshold: this.failureRateWarning,
                    previous_state: oldState
                });
            }
            else if (newState === 'normal' && oldState !== 'normal') {
                // Recovery event
                this.emitAlert('failure.rate.recovered', {
                    severity: 'info',
                    failure_rate: failureRate,
                    failures: this.recentFailures.length,
                    executions: this.recentExecutions.length,
                    window_ms: this.failureRateWindow,
                    previous_state: oldState
                });
            }
        }
    }
    /**
     * Phase 5A.3: Check for execution stall
     *
     * @param {number} lastExecutionTime - Timestamp of last execution start
     * @param {number} queuedCount - Current queued count
     */
    checkExecutionStall(lastExecutionTime, queuedCount) {
        if (queuedCount === 0) {
            // No work queued, not a stall
            if (this.alertStates.executionStall === 'stalled') {
                this.alertStates.executionStall = 'normal';
                this.emitAlert('execution.stall.recovered', {
                    severity: 'info',
                    queue_depth: queuedCount
                });
            }
            return;
        }
        const now = Date.now();
        const timeSinceLastExecution = now - lastExecutionTime;
        let newState = 'normal';
        if (timeSinceLastExecution >= this.stallThresholdMs && queuedCount > 0) {
            newState = 'stalled';
        }
        const oldState = this.alertStates.executionStall;
        // Only emit if state changed
        if (newState !== oldState) {
            this.alertStates.executionStall = newState;
            if (newState === 'stalled') {
                this.emitAlert('execution.stall.detected', {
                    severity: 'error',
                    time_since_last_execution_ms: timeSinceLastExecution,
                    threshold_ms: this.stallThresholdMs,
                    queue_depth: queuedCount,
                    last_execution_time: new Date(lastExecutionTime).toISOString()
                });
            }
            else if (newState === 'normal' && oldState === 'stalled') {
                // Recovery event
                this.emitAlert('execution.stall.recovered', {
                    severity: 'info',
                    queue_depth: queuedCount
                });
            }
        }
    }
    /**
     * Get event severity based on type
     *
     * @param {string} type - Event type
     * @returns {string} Severity level
     */
    _getSeverity(type) {
        if (type === 'failed' || type === 'timeout') {
            return 'error';
        }
        if (type === 'retried' || type === 'blocked') {
            return 'warning';
        }
        return 'info';
    }
    /**
     * Internal emit with buffering and circuit breaker
     *
     * @param {object} event - Event object
     */
    _emit(event) {
        if (!this.eventStream) {
            // Buffer event until connected
            if (this.buffer.length < this.maxBufferSize) {
                this.buffer.push(event);
            }
            else {
                // Buffer full, drop oldest event and add recovery marker
                this.buffer.shift();
                this.buffer.push({
                    event_id: generateEventId(),
                    event_type: 'system.events.dropped',
                    timestamp: new Date().toISOString(),
                    severity: 'warning',
                    payload: { reason: 'buffer_overflow' }
                });
            }
            return;
        }
        try {
            // Publish to all connected clients
            this.eventStream.publish(event);
            // Reset failure counter on success
            this.failureCount = 0;
        }
        catch (error) {
            console.error('[ViennaEventEmitter] Failed to emit event:', error);
            this.failureCount++;
            // Open circuit breaker if too many failures
            if (this.failureCount >= this.maxFailures) {
                this.circuitBreakerOpen = true;
                console.error('[ViennaEventEmitter] Circuit breaker opened after', this.maxFailures, 'failures');
                // Attempt to recover after delay
                setTimeout(() => {
                    this.circuitBreakerOpen = false;
                    this.failureCount = 0;
                    console.log('[ViennaEventEmitter] Circuit breaker reset');
                }, 60000); // 1 minute
            }
        }
    }
    /**
     * Flush buffered events
     */
    _flushBuffer() {
        if (this.buffer.length === 0) {
            return;
        }
        console.log(`[ViennaEventEmitter] Flushing ${this.buffer.length} buffered events`);
        const events = this.buffer.splice(0);
        for (const event of events) {
            this._emit(event);
        }
    }
    /**
     * Get emitter status
     *
     * @returns {object} Status
     */
    getStatus() {
        return {
            enabled: this.enabled,
            connected: !!this.eventStream,
            buffered_events: this.buffer.length,
            circuit_breaker_open: this.circuitBreakerOpen,
            failure_count: this.failureCount,
            max_failures: this.maxFailures,
            alert_states: { ...this.alertStates }, // Phase 5A.3
            recent_failures: this.recentFailures.length,
            recent_executions: this.recentExecutions.length
        };
    }
    /**
     * Phase 5A.3: Reset failure rate tracking (for testing)
     *
     * @internal
     */
    _resetFailureRateTracking() {
        this.recentFailures = [];
        this.recentExecutions = [];
        this.alertStates.failureRate = 'normal';
    }
}
module.exports = { ViennaEventEmitter };
//# sourceMappingURL=event-emitter.js.map