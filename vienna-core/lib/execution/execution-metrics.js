/**
 * Execution Metrics
 * 
 * Phase 4E: Tracks execution time metrics for envelopes.
 * Provides latency percentiles, timeout rates, and slow execution detection.
 */

class ExecutionMetrics {
  constructor(options = {}) {
    this.metrics = new Map(); // objective_id → metrics
    this.allExecutions = []; // All execution times for global percentiles
    this.maxHistorySize = options.maxHistorySize || 10000;
    
    // Alert thresholds
    this.timeoutRateThreshold = options.timeoutRateThreshold || 0.05; // 5%
    this.slowExecutionThreshold = options.slowExecutionThreshold || 0.5; // 50% of timeout
    
    // Aggregated stats
    this.totalExecutions = 0;
    this.totalTimeouts = 0;
    this.totalFailures = 0;
    this.totalSuccess = 0;
  }
  
  /**
   * Record execution start
   * 
   * @param {string} envelopeId - Envelope ID
   * @param {string} objectiveId - Objective ID (optional)
   * @param {number} timeoutMs - Configured timeout
   * @returns {object} Tracking token
   */
  recordStart(envelopeId, objectiveId, timeoutMs) {
    const start = {
      envelopeId,
      objectiveId,
      timeoutMs,
      startTime: Date.now(),
      endTime: null,
      durationMs: null,
      status: 'executing'
    };
    
    return start;
  }
  
  /**
   * Record execution completion
   * 
   * @param {object} tracking - Tracking token from recordStart
   * @param {string} status - 'success' | 'failed' | 'timeout'
   */
  recordComplete(tracking, status) {
    tracking.endTime = Date.now();
    tracking.durationMs = tracking.endTime - tracking.startTime;
    tracking.status = status;
    
    // Update aggregated stats
    this.totalExecutions++;
    
    if (status === 'success') {
      this.totalSuccess++;
    } else if (status === 'timeout') {
      this.totalTimeouts++;
    } else if (status === 'failed') {
      this.totalFailures++;
    }
    
    // Store in global history
    this.allExecutions.push({
      envelopeId: tracking.envelopeId,
      objectiveId: tracking.objectiveId,
      durationMs: tracking.durationMs,
      timeoutMs: tracking.timeoutMs,
      status: tracking.status,
      timestamp: tracking.endTime
    });
    
    // Trim history if too large
    if (this.allExecutions.length > this.maxHistorySize) {
      this.allExecutions = this.allExecutions.slice(-this.maxHistorySize);
    }
    
    // Update objective-specific metrics
    if (tracking.objectiveId) {
      this._updateObjectiveMetrics(tracking.objectiveId, tracking);
    }
    
    // Check for slow execution
    if (status !== 'timeout' && this._isSlowExecution(tracking)) {
      this._recordSlowExecution(tracking);
    }
  }
  
  /**
   * Get execution metrics for objective
   * 
   * @param {string} objectiveId - Objective ID
   * @returns {object|null} Metrics summary
   */
  getObjectiveMetrics(objectiveId) {
    return this.metrics.get(objectiveId) || null;
  }
  
  /**
   * Get global execution metrics
   * 
   * @returns {object} Global metrics
   */
  getGlobalMetrics() {
    const executions = this.allExecutions;
    
    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        timeoutRate: 0,
        failureRate: 0,
        latency: { mean: 0, p50: 0, p95: 0, p99: 0 },
        alerts: []
      };
    }
    
    // Calculate latency percentiles
    const durations = executions
      .filter(e => e.durationMs !== null)
      .map(e => e.durationMs)
      .sort((a, b) => a - b);
    
    const latency = this._calculatePercentiles(durations);
    
    // Calculate rates
    const timeoutRate = this.totalTimeouts / this.totalExecutions;
    const failureRate = this.totalFailures / this.totalExecutions;
    const successRate = this.totalSuccess / this.totalExecutions;
    
    // Generate alerts
    const alerts = [];
    
    if (timeoutRate > this.timeoutRateThreshold) {
      alerts.push({
        type: 'high_timeout_rate',
        severity: 'warning',
        message: `Timeout rate ${(timeoutRate * 100).toFixed(1)}% exceeds threshold ${(this.timeoutRateThreshold * 100).toFixed(1)}%`,
        timeoutRate,
        threshold: this.timeoutRateThreshold,
        totalTimeouts: this.totalTimeouts,
        totalExecutions: this.totalExecutions
      });
    }
    
    return {
      totalExecutions: this.totalExecutions,
      totalSuccess: this.totalSuccess,
      totalTimeouts: this.totalTimeouts,
      totalFailures: this.totalFailures,
      successRate,
      timeoutRate,
      failureRate,
      latency,
      alerts
    };
  }
  
  /**
   * Get slow executions (>50% of timeout threshold)
   * 
   * @param {number} limit - Max results
   * @returns {Array<object>} Slow executions
   */
  getSlowExecutions(limit = 10) {
    return this.allExecutions
      .filter(e => this._isSlowExecutionData(e))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, limit);
  }
  
  /**
   * Get timeout executions
   * 
   * @param {number} limit - Max results
   * @returns {Array<object>} Timeout executions
   */
  getTimeouts(limit = 10) {
    return this.allExecutions
      .filter(e => e.status === 'timeout')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  
  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics.clear();
    this.allExecutions = [];
    this.totalExecutions = 0;
    this.totalTimeouts = 0;
    this.totalFailures = 0;
    this.totalSuccess = 0;
  }
  
  /**
   * Update objective-specific metrics
   * 
   * @private
   */
  _updateObjectiveMetrics(objectiveId, tracking) {
    if (!this.metrics.has(objectiveId)) {
      this.metrics.set(objectiveId, {
        objectiveId,
        executions: [],
        totalExecutions: 0,
        totalTimeouts: 0,
        totalFailures: 0,
        totalSuccess: 0
      });
    }
    
    const metrics = this.metrics.get(objectiveId);
    
    metrics.executions.push({
      envelopeId: tracking.envelopeId,
      durationMs: tracking.durationMs,
      status: tracking.status,
      timestamp: tracking.endTime
    });
    
    metrics.totalExecutions++;
    
    if (tracking.status === 'success') {
      metrics.totalSuccess++;
    } else if (tracking.status === 'timeout') {
      metrics.totalTimeouts++;
    } else if (tracking.status === 'failed') {
      metrics.totalFailures++;
    }
    
    // Trim history
    if (metrics.executions.length > 100) {
      metrics.executions = metrics.executions.slice(-100);
    }
  }
  
  /**
   * Calculate percentiles from sorted array
   * 
   * @private
   */
  _calculatePercentiles(sortedValues) {
    if (sortedValues.length === 0) {
      return { mean: 0, p50: 0, p95: 0, p99: 0 };
    }
    
    const mean = sortedValues.reduce((sum, v) => sum + v, 0) / sortedValues.length;
    const p50 = this._percentile(sortedValues, 0.50);
    const p95 = this._percentile(sortedValues, 0.95);
    const p99 = this._percentile(sortedValues, 0.99);
    
    return { mean, p50, p95, p99 };
  }
  
  /**
   * Get percentile value from sorted array
   * 
   * @private
   */
  _percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }
  
  /**
   * Check if execution is slow (>50% of timeout)
   * 
   * @private
   */
  _isSlowExecution(tracking) {
    if (!tracking.timeoutMs || tracking.durationMs === null) {
      return false;
    }
    const threshold = tracking.timeoutMs * this.slowExecutionThreshold;
    return tracking.durationMs > threshold;
  }
  
  /**
   * Check if execution data is slow
   * 
   * @private
   */
  _isSlowExecutionData(execution) {
    if (!execution.timeoutMs || execution.durationMs === null) {
      return false;
    }
    const threshold = execution.timeoutMs * this.slowExecutionThreshold;
    return execution.durationMs > threshold && execution.status !== 'timeout';
  }
  
  /**
   * Record slow execution (logging)
   * 
   * @private
   */
  _recordSlowExecution(tracking) {
    const percentOfTimeout = (tracking.durationMs / tracking.timeoutMs * 100).toFixed(1);
    console.warn(`[ExecutionMetrics] Slow execution detected: ${tracking.envelopeId} took ${tracking.durationMs}ms (${percentOfTimeout}% of ${tracking.timeoutMs}ms timeout)`);
  }
}

module.exports = { ExecutionMetrics };
