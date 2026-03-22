/**
 * Phase 7.4 Stage 4: Executor Health Monitor
 * 
 * Purpose: Continuously detect degraded execution conditions.
 * 
 * Design:
 * - Monitors queue backlog, latency, failure/retry rates
 * - Detects stalled envelopes
 * - Reports health state (HEALTHY, WARNING, CRITICAL, STALLED, PAUSED)
 * - Never mutates system state directly (read-only monitoring)
 */

const HealthState = {
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  STALLED: 'STALLED',
  PAUSED: 'PAUSED'
};

class ExecutorHealth {
  constructor(thresholds = {}) {
    this.thresholds = {
      stalled_execution_seconds: thresholds.stalled_execution_seconds || 30,
      queue_backlog_warning: thresholds.queue_backlog_warning || 25,
      queue_backlog_critical: thresholds.queue_backlog_critical || 100,
      failure_rate_warning: thresholds.failure_rate_warning || 0.15,
      retry_rate_warning: thresholds.retry_rate_warning || 0.20,
      avg_latency_warning_ms: thresholds.avg_latency_warning_ms || 5000,
      avg_latency_critical_ms: thresholds.avg_latency_critical_ms || 15000
    };
    
    this.lastCheck = null;
    this.recentExecutions = []; // Rolling window of recent execution times
    this.maxRecentExecutions = 100;
  }
  
  /**
   * Check executor health
   * 
   * @param {object} executor - QueuedExecutor instance
   * @returns {object} Health report
   */
  check(executor) {
    const now = Date.now();
    this.lastCheck = now;
    
    const queueStats = executor.getQueueState();
    const controlState = executor.getExecutionControlState();
    const dlqStats = executor.getDeadLetterStats();
    
    // Check if paused
    if (controlState.paused) {
      return {
        state: HealthState.PAUSED,
        timestamp: new Date(now).toISOString(),
        reason: controlState.reason,
        paused_at: controlState.paused_at,
        checks: {}
      };
    }
    
    // Run health checks
    const checks = {
      queue_backlog: this._checkQueueBacklog(queueStats),
      stalled_execution: this._checkStalledExecution(executor),
      failure_rate: this._checkFailureRate(queueStats, dlqStats),
      retry_rate: this._checkRetryRate(queueStats),
      avg_latency: this._checkAvgLatency(),
      dlq_growth: this._checkDLQGrowth(dlqStats)
    };
    
    // Determine overall state
    const state = this._determineOverallState(checks);
    
    return {
      state,
      timestamp: new Date(now).toISOString(),
      checks,
      metrics: {
        queue_depth: queueStats.queued,
        executing: queueStats.executing,
        failed: queueStats.failed,
        dead_lettered: dlqStats.total,
        avg_latency_ms: this._calculateAvgLatency()
      },
      thresholds: this.thresholds
    };
  }
  
  /**
   * Record execution completion (for latency tracking)
   * 
   * @param {number} durationMs - Execution duration in milliseconds
   */
  recordExecution(durationMs) {
    this.recentExecutions.push({
      timestamp: Date.now(),
      duration_ms: durationMs
    });
    
    // Keep only recent executions
    if (this.recentExecutions.length > this.maxRecentExecutions) {
      this.recentExecutions.shift();
    }
  }
  
  /**
   * Check queue backlog
   */
  _checkQueueBacklog(queueStats) {
    const depth = queueStats.queued;
    
    if (depth >= this.thresholds.queue_backlog_critical) {
      return {
        status: 'CRITICAL',
        message: `Queue backlog critical: ${depth} envelopes`,
        value: depth,
        threshold: this.thresholds.queue_backlog_critical
      };
    }
    
    if (depth >= this.thresholds.queue_backlog_warning) {
      return {
        status: 'WARNING',
        message: `Queue backlog elevated: ${depth} envelopes`,
        value: depth,
        threshold: this.thresholds.queue_backlog_warning
      };
    }
    
    return {
      status: 'HEALTHY',
      message: `Queue backlog normal: ${depth} envelopes`,
      value: depth
    };
  }
  
  /**
   * Check for stalled execution
   */
  _checkStalledExecution(executor) {
    const queueStats = executor.getQueueState();
    
    if (queueStats.executing === 0) {
      return {
        status: 'HEALTHY',
        message: 'No executing envelopes'
      };
    }
    
    // Check if any envelope has been executing too long
    const allEntries = executor.queue.getAllEntries();
    const executingEntries = allEntries.filter(e => e.state === 'executing');
    
    const now = Date.now();
    const stalledThreshold = this.thresholds.stalled_execution_seconds * 1000;
    
    for (const entry of executingEntries) {
      const executionTime = now - new Date(entry.started_at).getTime();
      
      if (executionTime > stalledThreshold) {
        return {
          status: 'STALLED',
          message: `Envelope ${entry.envelope_id} stalled for ${Math.floor(executionTime / 1000)}s`,
          envelope_id: entry.envelope_id,
          execution_time_seconds: Math.floor(executionTime / 1000),
          threshold_seconds: this.thresholds.stalled_execution_seconds
        };
      }
    }
    
    return {
      status: 'HEALTHY',
      message: `${executingEntries.length} envelope(s) executing normally`
    };
  }
  
  /**
   * Check failure rate
   */
  _checkFailureRate(queueStats, dlqStats) {
    const total = queueStats.total + dlqStats.total;
    
    if (total === 0) {
      return {
        status: 'HEALTHY',
        message: 'No executions yet',
        rate: 0
      };
    }
    
    const failures = queueStats.failed + dlqStats.total;
    const rate = failures / total;
    
    if (rate >= this.thresholds.failure_rate_warning) {
      return {
        status: 'WARNING',
        message: `High failure rate: ${(rate * 100).toFixed(1)}%`,
        rate,
        threshold: this.thresholds.failure_rate_warning
      };
    }
    
    return {
      status: 'HEALTHY',
      message: `Failure rate normal: ${(rate * 100).toFixed(1)}%`,
      rate
    };
  }
  
  /**
   * Check retry rate
   */
  _checkRetryRate(queueStats) {
    const total = queueStats.total;
    
    if (total === 0) {
      return {
        status: 'HEALTHY',
        message: 'No executions yet',
        rate: 0
      };
    }
    
    // Estimate retries from failed count (approximation)
    const retries = queueStats.failed;
    const rate = retries / total;
    
    if (rate >= this.thresholds.retry_rate_warning) {
      return {
        status: 'WARNING',
        message: `High retry rate: ${(rate * 100).toFixed(1)}%`,
        rate,
        threshold: this.thresholds.retry_rate_warning
      };
    }
    
    return {
      status: 'HEALTHY',
      message: `Retry rate normal: ${(rate * 100).toFixed(1)}%`,
      rate
    };
  }
  
  /**
   * Check average latency
   */
  _checkAvgLatency() {
    const avgLatency = this._calculateAvgLatency();
    
    if (avgLatency === null) {
      return {
        status: 'HEALTHY',
        message: 'No latency data yet'
      };
    }
    
    if (avgLatency >= this.thresholds.avg_latency_critical_ms) {
      return {
        status: 'CRITICAL',
        message: `Average latency critical: ${avgLatency.toFixed(0)}ms`,
        value_ms: avgLatency,
        threshold_ms: this.thresholds.avg_latency_critical_ms
      };
    }
    
    if (avgLatency >= this.thresholds.avg_latency_warning_ms) {
      return {
        status: 'WARNING',
        message: `Average latency elevated: ${avgLatency.toFixed(0)}ms`,
        value_ms: avgLatency,
        threshold_ms: this.thresholds.avg_latency_warning_ms
      };
    }
    
    return {
      status: 'HEALTHY',
      message: `Average latency normal: ${avgLatency.toFixed(0)}ms`,
      value_ms: avgLatency
    };
  }
  
  /**
   * Check DLQ growth
   */
  _checkDLQGrowth(dlqStats) {
    const deadLettered = dlqStats.by_state?.dead_lettered || 0;
    
    if (deadLettered >= 50) {
      return {
        status: 'WARNING',
        message: `High number of dead-lettered envelopes: ${deadLettered}`,
        count: deadLettered
      };
    }
    
    return {
      status: 'HEALTHY',
      message: `Dead letter queue normal: ${deadLettered} entries`,
      count: deadLettered
    };
  }
  
  /**
   * Calculate average latency from recent executions
   */
  _calculateAvgLatency() {
    if (this.recentExecutions.length === 0) {
      return null;
    }
    
    const sum = this.recentExecutions.reduce((acc, e) => acc + e.duration_ms, 0);
    return sum / this.recentExecutions.length;
  }
  
  /**
   * Determine overall health state from checks
   */
  _determineOverallState(checks) {
    const statuses = Object.values(checks).map(c => c.status);
    
    if (statuses.includes('STALLED')) {
      return HealthState.STALLED;
    }
    
    if (statuses.includes('CRITICAL')) {
      return HealthState.CRITICAL;
    }
    
    if (statuses.includes('WARNING')) {
      return HealthState.WARNING;
    }
    
    return HealthState.HEALTHY;
  }
}

module.exports = { ExecutorHealth, HealthState };
