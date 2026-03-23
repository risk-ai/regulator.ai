/**
 * Structured Logger
 * Phase 6D: System Hardening
 * 
 * Replaces ad-hoc console logging with structured JSON logs.
 * 
 * Features:
 * - JSON-formatted event logs
 * - Timestamped and traceable
 * - Category-based filtering
 * - Severity levels (debug, info, warn, error)
 * - Optional persistence
 */

const fs = require('fs').promises;
const path = require('path');

class StructuredLogger {
  constructor(options = {}) {
    // Configuration
    this.enabled = options.enabled !== false;
    this.minLevel = options.minLevel || 'info'; // debug, info, warn, error
    this.persistEnabled = options.persistEnabled === true;
    this.persistPath = options.persistPath || null;
    this.maxBufferSize = options.maxBufferSize || 1000;
    
    // Severity levels
    this.LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // State
    this.buffer = [];
    this.logCounter = 0;
  }
  
  /**
   * Log an event
   * 
   * @param {string} event - Event name (e.g., execution.started)
   * @param {object} data - Event data
   * @param {object} options - Log options
   */
  log(event, data = {}, options = {}) {
    if (!this.enabled) return;
    
    const level = options.level || 'info';
    
    // Check severity level
    if (this.LEVELS[level] < this.LEVELS[this.minLevel]) {
      return;
    }
    
    const entry = {
      log_id: `log_${this.logCounter++}`,
      timestamp: new Date().toISOString(),
      event,
      level,
      objective_id: data.objective_id || null,
      envelope_id: data.envelope_id || null,
      provider: data.provider || null,
      agent_id: data.agent_id || null,
      status: data.status || null,
      duration_ms: data.duration_ms || null,
      error: data.error || null,
      metadata: data.metadata || {},
      source: options.source || 'unknown'
    };
    
    // Always buffer for querying
    this._bufferEntry(entry);
    
    // Log to console (always, for visibility)
    this._logToConsole(entry);
    
    return entry;
  }
  
  /**
   * Log execution started
   */
  logExecutionStarted(envelopeId, objectiveId, provider) {
    return this.log('execution.started', {
      envelope_id: envelopeId,
      objective_id: objectiveId,
      provider,
      status: 'started'
    });
  }
  
  /**
   * Log execution completed
   */
  logExecutionCompleted(envelopeId, objectiveId, provider, durationMs, result = null) {
    return this.log('execution.completed', {
      envelope_id: envelopeId,
      objective_id: objectiveId,
      provider,
      status: 'completed',
      duration_ms: durationMs,
      metadata: { result }
    });
  }
  
  /**
   * Log execution failed
   */
  logExecutionFailed(envelopeId, objectiveId, provider, durationMs, error) {
    return this.log('execution.failed', {
      envelope_id: envelopeId,
      objective_id: objectiveId,
      provider,
      status: 'failed',
      duration_ms: durationMs,
      error: error?.message || error
    }, { level: 'warn' });
  }
  
  /**
   * Log retry scheduled
   */
  logRetryScheduled(envelopeId, objectiveId, reason, retryCount, delayMs) {
    return this.log('retry.scheduled', {
      envelope_id: envelopeId,
      objective_id: objectiveId,
      status: 'scheduled',
      metadata: {
        reason,
        retry_count: retryCount,
        delay_ms: delayMs
      }
    });
  }
  
  /**
   * Log provider failure
   */
  logProviderFailure(provider, error, context = {}) {
    return this.log('provider.failure', {
      provider,
      status: 'failed',
      error: error?.message || error,
      metadata: context
    }, { level: 'warn' });
  }
  
  /**
   * Log provider recovery
   */
  logProviderRecovered(provider, context = {}) {
    return this.log('provider.recovered', {
      provider,
      status: 'healthy',
      metadata: context
    });
  }
  
  /**
   * Log objective completed
   */
  logObjectiveCompleted(objectiveId, totalEnvelopes, failedCount, durationMs) {
    return this.log('objective.completed', {
      objective_id: objectiveId,
      status: 'completed',
      duration_ms: durationMs,
      metadata: {
        total_envelopes: totalEnvelopes,
        failed_count: failedCount,
        success_count: totalEnvelopes - failedCount
      }
    });
  }
  
  /**
   * Log objective failed
   */
  logObjectiveFailed(objectiveId, reason, error) {
    return this.log('objective.failed', {
      objective_id: objectiveId,
      status: 'failed',
      error: error?.message || error,
      metadata: { reason }
    }, { level: 'warn' });
  }
  
  /**
   * Log runtime alert
   */
  logRuntimeAlert(alertType, data = {}) {
    return this.log('runtime.alert', {
      status: 'alert',
      metadata: {
        alert_type: alertType,
        ...data
      }
    }, { level: 'warn' });
  }
  
  /**
   * Log to console
   */
  _logToConsole(entry) {
    const levelIcon = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    }[entry.level] || '•';
    
    const parts = [
      `[${entry.timestamp}]`,
      `${levelIcon} ${entry.event}`
    ];
    
    if (entry.envelope_id) parts.push(`[env:${entry.envelope_id}]`);
    if (entry.objective_id) parts.push(`[obj:${entry.objective_id}]`);
    if (entry.provider) parts.push(`[provider:${entry.provider}]`);
    if (entry.duration_ms) parts.push(`(${entry.duration_ms}ms)`);
    
    const message = parts.join(' ');
    
    if (entry.error) {
      console.error(`${message} ${entry.error}`);
    } else if (entry.level === 'warn') {
      console.warn(message);
    } else if (entry.level === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  }
  
  /**
   * Buffer entry for querying (and optionally persistence)
   */
  _bufferEntry(entry) {
    this.buffer.push(entry);
    
    // Trim buffer if it exceeds max size
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Remove oldest
    }
    
    // Auto-flush to disk when buffer is large (only if persistence enabled)
    if (this.persistEnabled && this.buffer.length >= this.maxBufferSize / 2) {
      this.flush().catch(err => {
        console.error('[StructuredLogger] Flush failed:', err);
      });
    }
  }
  
  /**
   * Flush buffered logs to disk
   */
  async flush() {
    if (!this.persistEnabled || !this.persistPath || this.buffer.length === 0) {
      return;
    }
    
    try {
      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      
      const lines = this.buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      
      await fs.appendFile(this.persistPath, lines);
      
      this.buffer = [];
    } catch (error) {
      console.error('[StructuredLogger] Flush error:', error);
    }
  }
  
  /**
   * Get recent logs from buffer or disk
   */
  async getRecent(count = 100) {
    const logs = [];
    
    if (this.persistEnabled && this.persistPath) {
      try {
        const content = await fs.readFile(this.persistPath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);
        
        // Return last N lines
        for (let i = Math.max(0, lines.length - count); i < lines.length; i++) {
          try {
            logs.push(JSON.parse(lines[i]));
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      } catch (error) {
        // File doesn't exist yet or read error
      }
    }
    
    // Add buffered logs
    logs.push(...this.buffer);
    
    return logs.slice(-count);
  }
  
  /**
   * Query logs by criteria
   */
  async query(criteria = {}) {
    const recent = await this.getRecent(500);
    
    return recent.filter(log => {
      if (criteria.event && log.event !== criteria.event) return false;
      if (criteria.level && log.level !== criteria.level) return false;
      if (criteria.envelope_id && log.envelope_id !== criteria.envelope_id) return false;
      if (criteria.objective_id && log.objective_id !== criteria.objective_id) return false;
      if (criteria.provider && log.provider !== criteria.provider) return false;
      
      return true;
    });
  }
  
  /**
   * Get logger statistics
   */
  getStats() {
    return {
      enabled: this.enabled,
      persist_enabled: this.persistEnabled,
      persist_path: this.persistPath,
      min_level: this.minLevel,
      buffer_size: this.buffer.length,
      max_buffer_size: this.maxBufferSize,
      total_logs_created: this.logCounter
    };
  }
}

module.exports = { StructuredLogger };
