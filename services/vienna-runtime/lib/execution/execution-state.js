/**
 * Execution State API
 * 
 * Read-only inspection of execution state for debugging and monitoring.
 * Provides real-time view without direct database queries.
 */

class ExecutionState {
  constructor(options = {}) {
    this.queue = options.queue;
    this.recursionGuard = options.recursionGuard;
    this.replayLog = options.replayLog;
  }
  
  /**
   * Get current queue state
   * 
   * @returns {object} Queue statistics
   */
  getQueueState() {
    if (!this.queue) {
      return { error: 'Queue not available' };
    }
    
    return this.queue.getStats();
  }
  
  /**
   * Get active (executing) envelopes
   * 
   * @returns {array} Currently executing envelopes
   */
  getActiveEnvelopes() {
    if (!this.queue) {
      return [];
    }
    
    return this.queue.getEntriesByState('executing').map(entry => ({
      envelope_id: entry.envelope_id,
      objective_id: entry.envelope.objective_id,
      trigger_id: entry.envelope.trigger_id,
      causal_depth: entry.envelope.causal_depth,
      started_at: entry.started_at,
      duration_seconds: this._computeDuration(entry.started_at)
    }));
  }
  
  /**
   * Get all envelopes for objective
   * 
   * @param {string} objectiveId - Objective identifier
   * @returns {array} All envelopes for objective
   */
  getObjectiveState(objectiveId) {
    if (!this.queue) {
      return [];
    }
    
    return this.queue.getAllEntries()
      .filter(entry => entry.envelope.objective_id === objectiveId)
      .map(entry => ({
        envelope_id: entry.envelope_id,
        state: entry.state,
        queued_at: entry.queued_at,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
        causal_depth: entry.envelope.causal_depth,
        retry_count: entry.retry_count,
        blocking_reason: entry.blocking_reason
      }));
  }
  
  /**
   * Get causal chain for envelope
   * 
   * @param {string} envelopeId - Envelope to trace
   * @returns {Promise<array>} Ancestry tree
   */
  async getCausalChain(envelopeId) {
    if (!this.replayLog) {
      return [];
    }
    
    return this.replayLog.getCausalChain(envelopeId);
  }
  
  /**
   * Get blocked envelopes
   * 
   * @returns {array} Envelopes blocked by recursion guard
   */
  getBlockedEnvelopes() {
    if (!this.queue) {
      return [];
    }
    
    return this.queue.getEntriesByState('blocked').map(entry => ({
      envelope_id: entry.envelope_id,
      objective_id: entry.envelope.objective_id,
      trigger_id: entry.envelope.trigger_id,
      blocking_reason: entry.blocking_reason,
      queued_at: entry.queued_at
    }));
  }
  
  /**
   * Get execution metrics
   * 
   * @param {object} options - Metric options
   * @returns {Promise<object>} Execution metrics
   */
  async getExecutionMetrics(options = {}) {
    const metrics = {
      queue: this.getQueueState(),
      recursion: this._getRecursionMetrics(),
      replay: null
    };
    
    if (this.replayLog) {
      metrics.replay = await this.replayLog.getMetrics(options);
    }
    
    return metrics;
  }
  
  /**
   * Get recursion guard metrics
   */
  _getRecursionMetrics() {
    if (!this.recursionGuard) {
      return { error: 'Recursion guard not available' };
    }
    
    const state = this.recursionGuard.getState();
    
    // Compute additional metrics
    const triggerCount = Object.keys(state.trigger_budgets).length;
    const exhaustedTriggers = Object.values(state.trigger_budgets)
      .filter(budget => budget <= 0).length;
    
    return {
      active_triggers: triggerCount,
      exhausted_triggers: exhaustedTriggers,
      active_cooldowns: state.active_cooldowns.length,
      cached_idempotency_keys: state.cached_idempotency_keys,
      trigger_budgets: state.trigger_budgets
    };
  }
  
  /**
   * Compute duration in seconds
   */
  _computeDuration(startedAt) {
    if (!startedAt) return null;
    
    const start = new Date(startedAt);
    const now = new Date();
    return Math.floor((now - start) / 1000);
  }
  
  /**
   * Get full system state snapshot
   * 
   * @returns {Promise<object>} Complete state
   */
  async getSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      queue: this.getQueueState(),
      active_envelopes: this.getActiveEnvelopes(),
      blocked_envelopes: this.getBlockedEnvelopes(),
      recursion: this._getRecursionMetrics(),
      metrics: await this.getExecutionMetrics()
    };
  }
}

module.exports = { ExecutionState };
