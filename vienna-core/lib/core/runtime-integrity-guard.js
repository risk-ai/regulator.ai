/**
 * Runtime Integrity Guard
 * Phase 6E: System Hardening
 * 
 * Continuous runtime sanity checks to detect anomalies.
 * 
 * Monitors:
 * - Queue depth mismatches
 * - Executor stalls
 * - DLQ growth spikes
 * - Event emitter failures
 * - Memory pressure
 * - Provider outages
 * 
 * Behavior:
 * - Emit alerts on anomalies
 * - Mark runtime degraded when issues detected
 * - Surface alerts in Now view
 */

class RuntimeIntegrityGuard {
  constructor(options = {}) {
    // Configuration
    this.enabled = options.enabled !== false;
    this.checkIntervalMs = options.checkIntervalMs || 30000; // 30 seconds
    this.queueDepthThreshold = options.queueDepthThreshold || 500;
    this.dlqGrowthThreshold = options.dlqGrowthThreshold || 10; // 10 new items
    this.executorStallThresholdMs = options.executorStallThresholdMs || 300000; // 5 minutes
    this.memoryThresholdMB = options.memoryThresholdMB || 512;
    
    // Dependencies (injected)
    this.executionQueue = null;
    this.deadLetterQueue = null;
    this.eventEmitter = null;
    this.logger = null;
    this.providerHealthManager = null;
    
    // State tracking
    this.lastCheck = null;
    this.lastQueueDepth = 0;
    this.lastDLQSize = 0;
    this.lastExecutingEnvelopeId = null;
    this.lastExecutingTimestamp = null;
    this.checkTimer = null;
    this.running = false;
    
    // Anomaly tracking
    this.anomalies = [];
    this.runtimeStatus = 'operational'; // operational, degraded, critical
  }
  
  /**
   * Set dependencies (injected by ViennaCore)
   */
  setDependencies(executionQueue, deadLetterQueue, eventEmitter, logger, providerHealthManager) {
    this.executionQueue = executionQueue;
    this.deadLetterQueue = deadLetterQueue;
    this.eventEmitter = eventEmitter;
    this.logger = logger;
    this.providerHealthManager = providerHealthManager;
  }
  
  /**
   * Start integrity monitoring
   */
  start() {
    if (this.running || !this.enabled) return;
    
    this.running = true;
    console.log(`[RuntimeIntegrityGuard] Starting integrity checks (${this.checkIntervalMs}ms interval)`);
    
    // Run initial check
    this.runChecks();
    
    // Schedule periodic checks
    this.checkTimer = setInterval(() => {
      this.runChecks();
    }, this.checkIntervalMs);
  }
  
  /**
   * Stop integrity monitoring
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    console.log('[RuntimeIntegrityGuard] Stopped integrity checks');
  }
  
  /**
   * Run all integrity checks
   */
  runChecks() {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    this.lastCheck = timestamp;
    
    try {
      // Clear previous anomalies
      this.anomalies = [];
      
      // Run checks
      this._checkQueueDepth();
      this._checkExecutorStall();
      this._checkDLQGrowth();
      this._checkEventEmitter();
      this._checkMemoryPressure();
      this._checkProviderHealth();
      
      // Determine runtime status
      this._updateRuntimeStatus();
      
      // Emit alerts for new anomalies
      for (const anomaly of this.anomalies) {
        this._emitAlert(anomaly);
      }
      
    } catch (error) {
      console.error('[RuntimeIntegrityGuard] Check failed:', error);
      
      this.anomalies.push({
        type: 'integrity_check_failure',
        severity: 'critical',
        message: `Integrity check crashed: ${error.message}`,
        timestamp
      });
    }
  }
  
  /**
   * Check for queue depth anomalies
   */
  _checkQueueDepth() {
    if (!this.executionQueue) return;
    
    try {
      const queueState = this.executionQueue.queue;
      const fifo = this.executionQueue.fifo || [];
      
      const queueSize = queueState.size;
      const fifoSize = fifo.length;
      
      // Check for mismatch
      if (queueSize !== fifoSize) {
        this.anomalies.push({
          type: 'queue_depth_mismatch',
          severity: 'warn',
          message: `Queue size (${queueSize}) != FIFO size (${fifoSize})`,
          metadata: {
            queue_size: queueSize,
            fifo_size: fifoSize,
            delta: Math.abs(queueSize - fifoSize)
          }
        });
      }
      
      // Check for excessive depth
      if (queueSize > this.queueDepthThreshold) {
        this.anomalies.push({
          type: 'queue_depth_excessive',
          severity: 'warn',
          message: `Queue depth (${queueSize}) exceeds threshold (${this.queueDepthThreshold})`,
          metadata: {
            queue_size: queueSize,
            threshold: this.queueDepthThreshold
          }
        });
      }
      
      this.lastQueueDepth = queueSize;
      
    } catch (error) {
      this.anomalies.push({
        type: 'queue_check_failed',
        severity: 'error',
        message: `Queue depth check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Check for executor stall
   */
  _checkExecutorStall() {
    if (!this.executionQueue) return;
    
    try {
      const allEntries = Array.from(this.executionQueue.queue.values());
      const executing = allEntries.filter(e => e.state === 'executing');
      
      if (executing.length === 0) {
        // No stall if nothing executing
        this.lastExecutingEnvelopeId = null;
        this.lastExecutingTimestamp = null;
        return;
      }
      
      const currentEnvelope = executing[0]; // Check first executing envelope
      const currentEnvelopeId = currentEnvelope.envelope_id;
      const startedAt = currentEnvelope.started_at;
      
      if (!startedAt) return; // No timestamp, can't detect stall
      
      const age = Date.now() - new Date(startedAt).getTime();
      
      // Check if same envelope has been executing too long
      if (age > this.executorStallThresholdMs) {
        this.anomalies.push({
          type: 'executor_stall',
          severity: 'critical',
          message: `Envelope ${currentEnvelopeId} executing for ${Math.round(age / 1000)}s`,
          metadata: {
            envelope_id: currentEnvelopeId,
            started_at: startedAt,
            age_ms: age,
            threshold_ms: this.executorStallThresholdMs
          }
        });
      }
      
      this.lastExecutingEnvelopeId = currentEnvelopeId;
      this.lastExecutingTimestamp = startedAt;
      
    } catch (error) {
      this.anomalies.push({
        type: 'executor_check_failed',
        severity: 'error',
        message: `Executor stall check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Check for DLQ growth spike
   */
  _checkDLQGrowth() {
    if (!this.deadLetterQueue) return;
    
    try {
      const entries = this.deadLetterQueue.getEntries();
      const currentSize = entries.length;
      
      const growth = currentSize - this.lastDLQSize;
      
      if (growth >= this.dlqGrowthThreshold) {
        this.anomalies.push({
          type: 'dlq_growth_spike',
          severity: 'warn',
          message: `DLQ grew by ${growth} items (now ${currentSize})`,
          metadata: {
            previous_size: this.lastDLQSize,
            current_size: currentSize,
            growth,
            threshold: this.dlqGrowthThreshold
          }
        });
      }
      
      this.lastDLQSize = currentSize;
      
    } catch (error) {
      this.anomalies.push({
        type: 'dlq_check_failed',
        severity: 'error',
        message: `DLQ growth check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Check event emitter health
   */
  _checkEventEmitter() {
    if (!this.eventEmitter) return;
    
    try {
      // Check if circuit breaker is open
      if (this.eventEmitter.circuitBreakerOpen) {
        this.anomalies.push({
          type: 'event_emitter_failure',
          severity: 'critical',
          message: 'Event emitter circuit breaker is open',
          metadata: {
            failure_count: this.eventEmitter.failureCount || 0
          }
        });
      }
      
      // Check buffer overflow
      const bufferSize = this.eventEmitter.buffer?.length || 0;
      const maxBufferSize = this.eventEmitter.maxBufferSize || 100;
      
      if (bufferSize >= maxBufferSize * 0.9) {
        this.anomalies.push({
          type: 'event_buffer_near_full',
          severity: 'warn',
          message: `Event buffer near capacity (${bufferSize}/${maxBufferSize})`,
          metadata: {
            buffer_size: bufferSize,
            max_buffer_size: maxBufferSize,
            utilization: (bufferSize / maxBufferSize * 100).toFixed(1) + '%'
          }
        });
      }
      
    } catch (error) {
      this.anomalies.push({
        type: 'event_emitter_check_failed',
        severity: 'error',
        message: `Event emitter check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Check for memory pressure
   */
  _checkMemoryPressure() {
    try {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      
      if (heapUsedMB > this.memoryThresholdMB) {
        this.anomalies.push({
          type: 'memory_pressure',
          severity: 'warn',
          message: `Heap usage (${heapUsedMB}MB) exceeds threshold (${this.memoryThresholdMB}MB)`,
          metadata: {
            heap_used_mb: heapUsedMB,
            heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
            rss_mb: Math.round(usage.rss / 1024 / 1024),
            threshold_mb: this.memoryThresholdMB
          }
        });
      }
      
    } catch (error) {
      this.anomalies.push({
        type: 'memory_check_failed',
        severity: 'error',
        message: `Memory check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Check provider health status
   */
  _checkProviderHealth() {
    if (!this.providerHealthManager) return;
    
    try {
      const runtimeHealth = this.providerHealthManager.getRuntimeHealth();
      
      if (runtimeHealth.runtime_status === 'critical') {
        this.anomalies.push({
          type: 'provider_outage',
          severity: 'critical',
          message: `All providers unavailable (${runtimeHealth.quarantined_count} quarantined)`,
          metadata: {
            total_providers: runtimeHealth.total_providers,
            healthy_count: runtimeHealth.healthy_count,
            quarantined_count: runtimeHealth.quarantined_count
          }
        });
      } else if (runtimeHealth.runtime_status === 'degraded') {
        if (runtimeHealth.quarantined_count > 0) {
          this.anomalies.push({
            type: 'provider_degraded',
            severity: 'warn',
            message: `${runtimeHealth.quarantined_count} provider(s) quarantined`,
            metadata: {
              total_providers: runtimeHealth.total_providers,
              healthy_count: runtimeHealth.healthy_count,
              quarantined_count: runtimeHealth.quarantined_count
            }
          });
        }
      }
      
    } catch (error) {
      this.anomalies.push({
        type: 'provider_health_check_failed',
        severity: 'error',
        message: `Provider health check failed: ${error.message}`
      });
    }
  }
  
  /**
   * Update runtime status based on anomalies
   */
  _updateRuntimeStatus() {
    const criticalAnomalies = this.anomalies.filter(a => a.severity === 'critical');
    const warnAnomalies = this.anomalies.filter(a => a.severity === 'warn');
    
    if (criticalAnomalies.length > 0) {
      this.runtimeStatus = 'critical';
    } else if (warnAnomalies.length > 0) {
      this.runtimeStatus = 'degraded';
    } else {
      this.runtimeStatus = 'operational';
    }
  }
  
  /**
   * Emit alert for anomaly
   */
  _emitAlert(anomaly) {
    const alertData = {
      anomaly_type: anomaly.type,
      severity: anomaly.severity,
      message: anomaly.message,
      metadata: anomaly.metadata || {},
      timestamp: anomaly.timestamp || new Date().toISOString()
    };
    
    // Emit via event emitter
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emitAlert('runtime.integrity.anomaly', alertData);
      } catch (error) {
        console.error('[RuntimeIntegrityGuard] Failed to emit alert:', error);
      }
    }
    
    // Log via structured logger
    if (this.logger) {
      try {
        this.logger.logRuntimeAlert(anomaly.type, alertData);
      } catch (error) {
        console.error('[RuntimeIntegrityGuard] Failed to log alert:', error);
      }
    }
    
    // Console output
    const icon = anomaly.severity === 'critical' ? '🚨' : anomaly.severity === 'error' ? '❌' : '⚠️';
    console.warn(`${icon} [RuntimeIntegrityGuard] ${anomaly.type}: ${anomaly.message}`);
  }
  
  /**
   * Get current runtime status
   */
  getRuntimeStatus() {
    return {
      status: this.runtimeStatus,
      last_check: this.lastCheck,
      anomalies: this.anomalies,
      checks_enabled: this.enabled,
      check_interval_ms: this.checkIntervalMs
    };
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      running: this.running,
      last_check: this.lastCheck,
      runtime_status: this.runtimeStatus,
      current_anomalies: this.anomalies.length,
      check_interval_ms: this.checkIntervalMs,
      last_queue_depth: this.lastQueueDepth,
      last_dlq_size: this.lastDLQSize
    };
  }
}

module.exports = { RuntimeIntegrityGuard };
