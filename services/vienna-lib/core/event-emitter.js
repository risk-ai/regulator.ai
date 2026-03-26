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
    this.circuitBreakerHalfOpen = false;
    this.circuitBreakerState = 'closed'; // closed, open, half-open
    this.lastFailureTime = 0;
    this.lastStateTransition = Date.now();
    this.queueCapacity = options.queueCapacity || 1000;
    
    // Enhanced circuit breaker configuration
    this.circuitBreakerConfig = {
      failure_threshold: options.maxFailures || 10,
      recovery_timeout_ms: options.recovery_timeout_ms || 60000, // 1 minute
      half_open_max_calls: options.half_open_max_calls || 3,
      half_open_success_threshold: options.half_open_success_threshold || 2,
      failure_thresholds_per_action: options.failure_thresholds_per_action || {
        'execution.failed': 5,
        'execution.timeout': 3,
        'alert.failure.rate.critical': 2
      }
    };
    
    // Metrics tracking
    this.metrics = {
      state_transitions: {
        open: 0,
        close: 0,
        half_open: 0
      },
      total_failures: 0,
      total_successes: 0,
      half_open_attempts: 0,
      half_open_successes: 0
    };
    
    // Alert thresholds (configurable)
    this.queueWarningThreshold = options.queueWarningThreshold || 0.7;
    this.queueCriticalThreshold = options.queueCriticalThreshold || 0.9;
    this.failureRateWarning = options.failureRateWarning || 0.05;
    this.failureRateCritical = options.failureRateCritical || 0.10;
    this.failureRateWindow = options.failureRateWindow || 300000; // 5 minutes
    this.stallThresholdMs = options.stallThresholdMs || 60000; // 1 minute
    
    // Phase 5A.3: Stateful alert tracking (deduplication)
    this.alertStates = {
      queueDepth: 'normal',      // normal | warning | critical
      failureRate: 'normal',     // normal | warning | critical
      executionStall: 'normal'   // normal | stalled
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
    } else if (queuedCount >= warningThreshold) {
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
      } else if (newState === 'warning') {
        this.emitAlert('queue.depth.warning', {
          severity: 'warning',
          current_depth: queuedCount,
          capacity: this.queueCapacity,
          threshold: warningThreshold,
          utilization,
          previous_state: oldState
        });
      } else if (newState === 'normal' && oldState !== 'normal') {
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
    this.recentExecutions = this.recentExecutions.filter(
      e => now - e.timestamp < this.failureRateWindow
    );
    this.recentFailures = this.recentFailures.filter(
      e => now - e.timestamp < this.failureRateWindow
    );
    
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
    } else if (failureRate >= this.failureRateWarning) {
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
      } else if (newState === 'warning') {
        this.emitAlert('failure.rate.warning', {
          severity: 'warning',
          failure_rate: failureRate,
          failures: this.recentFailures.length,
          executions: this.recentExecutions.length,
          window_ms: this.failureRateWindow,
          threshold: this.failureRateWarning,
          previous_state: oldState
        });
      } else if (newState === 'normal' && oldState !== 'normal') {
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
      } else if (newState === 'normal' && oldState === 'stalled') {
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
    // Check circuit breaker state before attempting emit
    if (!this._canEmit()) {
      return;
    }

    if (!this.eventStream) {
      // Buffer event until connected
      if (this.buffer.length < this.maxBufferSize) {
        this.buffer.push(event);
      } else {
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
      // Track half-open attempts if in that state
      if (this.circuitBreakerState === 'half-open') {
        this.metrics.half_open_attempts++;
      }

      // Publish to all connected clients
      this.eventStream.publish(event);
      
      // Record success
      this._recordSuccess();
    } catch (error) {
      console.error('[ViennaEventEmitter] Failed to emit event:', error);
      
      // Record failure with action-specific thresholds
      this._recordFailure(event.event_type);
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
      circuit_breaker_state: this.circuitBreakerState,
      circuit_breaker_open: this.circuitBreakerOpen,
      circuit_breaker_half_open: this.circuitBreakerHalfOpen,
      failure_count: this.failureCount,
      max_failures: this.maxFailures,
      last_failure_time: this.lastFailureTime,
      last_state_transition: this.lastStateTransition,
      metrics: { ...this.metrics },
      circuit_breaker_config: { ...this.circuitBreakerConfig },
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

  /**
   * Enhanced circuit breaker: Check if we can emit events
   * 
   * @private
   */
  _canEmit() {
    const now = Date.now();

    // If circuit is closed, allow emit
    if (this.circuitBreakerState === 'closed') {
      return true;
    }

    // If circuit is open, check if we should try half-open
    if (this.circuitBreakerState === 'open') {
      if (now - this.lastFailureTime >= this.circuitBreakerConfig.recovery_timeout_ms) {
        this._transitionToHalfOpen();
        return true;
      }
      return false;
    }

    // If circuit is half-open, allow limited requests
    if (this.circuitBreakerState === 'half-open') {
      return this.metrics.half_open_attempts < this.circuitBreakerConfig.half_open_max_calls;
    }

    return false;
  }

  /**
   * Record successful emit
   * 
   * @private
   */
  _recordSuccess() {
    this.metrics.total_successes++;
    this.failureCount = Math.max(0, this.failureCount - 1); // Gradual recovery

    if (this.circuitBreakerState === 'half-open') {
      this.metrics.half_open_successes++;
      
      // Check if we should close the circuit
      if (this.metrics.half_open_successes >= this.circuitBreakerConfig.half_open_success_threshold) {
        this._transitionToClosed();
      }
    }
  }

  /**
   * Record failed emit with action-specific thresholds
   * 
   * @private
   */
  _recordFailure(eventType) {
    this.metrics.total_failures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Get failure threshold for this action type
    const actionThreshold = this.circuitBreakerConfig.failure_thresholds_per_action[eventType] || 
                           this.circuitBreakerConfig.failure_threshold;

    if (this.circuitBreakerState === 'closed') {
      if (this.failureCount >= actionThreshold) {
        this._transitionToOpen();
      }
    } else if (this.circuitBreakerState === 'half-open') {
      // Any failure in half-open state goes back to open
      this._transitionToOpen();
    }
  }

  /**
   * Transition circuit breaker to open state
   * 
   * @private
   */
  _transitionToOpen() {
    if (this.circuitBreakerState !== 'open') {
      this.circuitBreakerState = 'open';
      this.circuitBreakerOpen = true;
      this.circuitBreakerHalfOpen = false;
      this.lastStateTransition = Date.now();
      this.metrics.state_transitions.open++;

      console.error(`[ViennaEventEmitter] Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Transition circuit breaker to half-open state
   * 
   * @private
   */
  _transitionToHalfOpen() {
    if (this.circuitBreakerState !== 'half-open') {
      this.circuitBreakerState = 'half-open';
      this.circuitBreakerOpen = false;
      this.circuitBreakerHalfOpen = true;
      this.lastStateTransition = Date.now();
      this.metrics.state_transitions.half_open++;
      this.metrics.half_open_attempts = 0;
      this.metrics.half_open_successes = 0;

      console.log('[ViennaEventEmitter] Circuit breaker HALF-OPEN - testing recovery');
    }
  }

  /**
   * Transition circuit breaker to closed state
   * 
   * @private
   */
  _transitionToClosed() {
    if (this.circuitBreakerState !== 'closed') {
      this.circuitBreakerState = 'closed';
      this.circuitBreakerOpen = false;
      this.circuitBreakerHalfOpen = false;
      this.lastStateTransition = Date.now();
      this.metrics.state_transitions.close++;
      this.failureCount = 0;

      console.log('[ViennaEventEmitter] Circuit breaker CLOSED - service recovered');
    }
  }

  /**
   * Manually reset circuit breaker (for emergency or testing)
   */
  resetCircuitBreaker() {
    this._transitionToClosed();
    this.metrics.half_open_attempts = 0;
    this.metrics.half_open_successes = 0;
    console.log('[ViennaEventEmitter] Circuit breaker manually reset');
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics() {
    return {
      state: this.circuitBreakerState,
      state_duration_ms: Date.now() - this.lastStateTransition,
      failure_count: this.failureCount,
      metrics: { ...this.metrics },
      config: { ...this.circuitBreakerConfig }
    };
  }
}


module.exports = { ViennaEventEmitter };
