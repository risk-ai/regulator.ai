/**
 * Crash Recovery Manager
 * Phase 6C: System Hardening
 * 
 * Ensures Vienna can recover safely after runtime crash or unexpected shutdown.
 * 
 * Features:
 * - Scan execution queue on startup
 * - Detect envelopes stuck in EXECUTING state
 * - Reconcile execution state
 * - Retry or mark failed safely
 * - Crash recovery reporting
 */

class CrashRecoveryManager {
  constructor(options = {}) {
    this.executionQueue = null;
    this.deadLetterQueue = null;
    this.eventEmitter = null;
    
    // Configuration
    this.maxRecoveryRetries = options.maxRecoveryRetries || 1;
    this.orphanedExecutionThresholdMs = options.orphanedExecutionThresholdMs || 300000; // 5 minutes
    this.enableAutomaticRecovery = options.enableAutomaticRecovery !== false;
    
    // Recovery state
    this.lastRecoveryRun = null;
    this.recoveryStats = {
      total_runs: 0,
      last_run: null,
      orphaned_detected: 0,
      retried: 0,
      failed: 0,
      abandoned: 0
    };
  }
  
  /**
   * Set dependencies (injected by ViennaCore)
   */
  setDependencies(executionQueue, deadLetterQueue, eventEmitter) {
    this.executionQueue = executionQueue;
    this.deadLetterQueue = deadLetterQueue;
    this.eventEmitter = eventEmitter;
  }
  
  /**
   * Run crash recovery on startup
   * 
   * @returns {Promise<object>} Recovery report
   */
  async runRecovery() {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('[CrashRecoveryManager] Starting crash recovery scan...');
    
    if (!this.executionQueue) {
      throw new Error('Execution queue not set - call setDependencies() first');
    }
    
    const report = {
      timestamp,
      recovery_type: 'startup',
      orphaned_envelopes: [],
      actions: [],
      summary: {
        total_scanned: 0,
        orphaned_found: 0,
        retried: 0,
        failed: 0,
        abandoned: 0,
        skipped: 0
      },
      duration_ms: 0
    };
    
    try {
      // Scan execution queue for stuck envelopes
      const allEntries = Array.from(this.executionQueue.queue.values());
      report.summary.total_scanned = allEntries.length;
      
      console.log(`[CrashRecoveryManager] Scanning ${allEntries.length} queue entries...`);
      
      for (const entry of allEntries) {
        if (entry.state === 'executing') {
          // Check if execution is orphaned (started long ago, no recent updates)
          const isOrphaned = this.isOrphanedExecution(entry);
          
          if (isOrphaned) {
            report.orphaned_envelopes.push({
              envelope_id: entry.envelope_id,
              objective_id: entry.objective_id,
              started_at: entry.started_at,
              age_ms: Date.now() - new Date(entry.started_at).getTime()
            });
            
            report.summary.orphaned_found++;
            
            // Decide recovery action
            const action = await this.recoverOrphanedEnvelope(entry);
            report.actions.push(action);
            
            if (action.action === 'retry') {
              report.summary.retried++;
            } else if (action.action === 'failed') {
              report.summary.failed++;
            } else if (action.action === 'abandoned') {
              report.summary.abandoned++;
            } else if (action.action === 'skipped') {
              report.summary.skipped++;
            }
          }
        }
      }
      
      // Update recovery stats
      this.recoveryStats.total_runs++;
      this.recoveryStats.last_run = timestamp;
      this.recoveryStats.orphaned_detected += report.summary.orphaned_found;
      this.recoveryStats.retried += report.summary.retried;
      this.recoveryStats.failed += report.summary.failed;
      this.recoveryStats.abandoned += report.summary.abandoned;
      
      this.lastRecoveryRun = timestamp;
      
      report.duration_ms = Date.now() - startTime;
      
      // Log summary
      console.log(
        `[CrashRecoveryManager] Recovery complete: ` +
        `${report.summary.orphaned_found} orphaned, ` +
        `${report.summary.retried} retried, ` +
        `${report.summary.failed} failed, ` +
        `${report.summary.abandoned} abandoned ` +
        `(${report.duration_ms}ms)`
      );
      
      // Emit recovery event if orphans found
      if (report.summary.orphaned_found > 0) {
        this.emitRecoveryEvent('runtime.crash_recovery.completed', {
          orphaned_count: report.summary.orphaned_found,
          retried_count: report.summary.retried,
          failed_count: report.summary.failed,
          duration_ms: report.duration_ms
        });
      }
      
      return report;
      
    } catch (error) {
      console.error('[CrashRecoveryManager] Recovery failed:', error);
      
      this.emitRecoveryEvent('runtime.crash_recovery.failed', {
        error: error.message,
        duration_ms: Date.now() - startTime
      });
      
      throw error;
    }
  }
  
  /**
   * Check if an execution is orphaned (stuck due to crash)
   * 
   * @param {object} entry - Queue entry
   * @returns {boolean} True if orphaned
   */
  isOrphanedExecution(entry) {
    if (entry.state !== 'executing') {
      return false;
    }
    
    if (!entry.started_at) {
      // No start time = immediately orphaned
      return true;
    }
    
    const startedAt = new Date(entry.started_at);
    const age = Date.now() - startedAt.getTime();
    
    // Orphaned if executing for longer than threshold
    return age > this.orphanedExecutionThresholdMs;
  }
  
  /**
   * Recover an orphaned envelope
   * 
   * @param {object} entry - Queue entry
   * @returns {Promise<object>} Recovery action taken
   */
  async recoverOrphanedEnvelope(entry) {
    const action = {
      envelope_id: entry.envelope_id,
      objective_id: entry.objective_id,
      action: null,
      reason: null,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[CrashRecoveryManager] Recovering orphaned envelope: ${entry.envelope_id}`);
    
    // Check retry count
    const retryCount = entry.retry_count || 0;
    
    if (!this.enableAutomaticRecovery) {
      // Manual recovery mode - mark as blocked for operator review
      await this.executionQueue.markBlocked(entry.envelope_id, 'crash_recovery_manual_review');
      
      action.action = 'skipped';
      action.reason = 'automatic_recovery_disabled';
      
      console.log(`[CrashRecoveryManager] Envelope ${entry.envelope_id} blocked for manual review`);
      
    } else if (retryCount >= this.maxRecoveryRetries) {
      // Too many retries - send to DLQ
      if (this.deadLetterQueue) {
        await this.deadLetterQueue.deadLetter({
          envelope_id: entry.envelope_id,
          envelope: entry.envelope,
          objective_id: entry.objective_id,
          reason: 'CRASH_RECOVERY_EXHAUSTED',
          error: `Envelope stuck after ${retryCount} recovery attempts`,
          retry_count: retryCount,
          last_state: 'executing'
        });
        
        // Remove from execution queue
        await this.executionQueue.remove(entry.envelope_id);
        
        action.action = 'failed';
        action.reason = 'max_recovery_retries_exceeded';
        
        console.log(`[CrashRecoveryManager] Envelope ${entry.envelope_id} sent to DLQ`);
      } else {
        // No DLQ available - just mark failed
        await this.executionQueue.markFailed(entry.envelope_id, {
          message: 'Crash recovery exhausted',
          recovery_attempts: retryCount
        });
        
        action.action = 'abandoned';
        action.reason = 'no_dlq_available';
        
        console.log(`[CrashRecoveryManager] Envelope ${entry.envelope_id} marked failed (no DLQ)`);
      }
      
    } else {
      // Retry envelope - reset to queued state in place
      entry.state = 'queued';
      entry.started_at = null;
      entry.completed_at = null;
      entry.retry_count = retryCount + 1;
      entry.error = null;
      
      // Move back to front of FIFO queue for immediate retry
      const fifo = this.executionQueue.fifo;
      const index = fifo.indexOf(entry.envelope_id);
      if (index > -1) {
        fifo.splice(index, 1);
      }
      fifo.unshift(entry.envelope_id);
      
      action.action = 'retry';
      action.reason = 'automatic_recovery';
      action.retry_count = retryCount + 1;
      
      console.log(
        `[CrashRecoveryManager] Envelope ${entry.envelope_id} requeued ` +
        `(retry ${retryCount + 1}/${this.maxRecoveryRetries})`
      );
    }
    
    return action;
  }
  
  /**
   * Validate queue consistency (detect anomalies)
   * 
   * @returns {object} Validation result
   */
  async validateQueueConsistency() {
    const issues = [];
    
    if (!this.executionQueue) {
      return { valid: false, issues: ['execution_queue_not_available'] };
    }
    
    const allEntries = Array.from(this.executionQueue.queue.values());
    const fifo = this.executionQueue.fifo || [];
    
    // Check queue vs FIFO consistency
    if (allEntries.length !== fifo.length) {
      issues.push({
        type: 'queue_fifo_mismatch',
        queue_size: allEntries.length,
        fifo_size: fifo.length
      });
    }
    
    // Check for duplicate envelope IDs
    const envelopeIds = allEntries.map(e => e.envelope_id);
    const duplicates = envelopeIds.filter((id, index) => envelopeIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      issues.push({
        type: 'duplicate_envelope_ids',
        duplicates: [...new Set(duplicates)]
      });
    }
    
    // Check for envelopes with invalid states
    const validStates = ['queued', 'executing', 'completed', 'failed', 'blocked'];
    const invalidStates = allEntries.filter(e => !validStates.includes(e.state));
    
    if (invalidStates.length > 0) {
      issues.push({
        type: 'invalid_envelope_states',
        count: invalidStates.length,
        envelope_ids: invalidStates.map(e => e.envelope_id)
      });
    }
    
    // Check for long-running executions
    const now = Date.now();
    const longRunning = allEntries.filter(e => {
      if (e.state !== 'executing' || !e.started_at) return false;
      const age = now - new Date(e.started_at).getTime();
      return age > this.orphanedExecutionThresholdMs;
    });
    
    if (longRunning.length > 0) {
      issues.push({
        type: 'long_running_executions',
        count: longRunning.length,
        threshold_ms: this.orphanedExecutionThresholdMs,
        envelope_ids: longRunning.map(e => e.envelope_id)
      });
    }
    
    return {
      valid: issues.length === 0,
      issues,
      stats: {
        total_envelopes: allEntries.length,
        queued: allEntries.filter(e => e.state === 'queued').length,
        executing: allEntries.filter(e => e.state === 'executing').length,
        completed: allEntries.filter(e => e.state === 'completed').length,
        failed: allEntries.filter(e => e.state === 'failed').length,
        blocked: allEntries.filter(e => e.state === 'blocked').length
      }
    };
  }
  
  /**
   * Get recovery statistics
   */
  getStats() {
    return {
      ...this.recoveryStats,
      automatic_recovery_enabled: this.enableAutomaticRecovery,
      max_recovery_retries: this.maxRecoveryRetries,
      orphaned_threshold_ms: this.orphanedExecutionThresholdMs
    };
  }
  
  /**
   * Emit recovery event
   */
  emitRecoveryEvent(eventType, data) {
    if (!this.eventEmitter) return;
    
    try {
      this.eventEmitter.emitAlert(eventType, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[CrashRecoveryManager] Failed to emit event:', error);
    }
  }
}

module.exports = { CrashRecoveryManager };
