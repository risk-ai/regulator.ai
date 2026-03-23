/**
 * Vienna Execution Queue
 * 
 * Durable FIFO queue for envelope execution.
 * Single-writer, single-executor model with persistence.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getRuntimePath } = require('../core/runtime-config');

const DEFAULT_QUEUE_FILE = getRuntimePath('execution-queue.jsonl');

/**
 * Queue states
 */
const QueueState = {
  QUEUED: 'queued',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked'
};

class ExecutionQueue {
  constructor(options = {}) {
    this.queueFile = options.queueFile || DEFAULT_QUEUE_FILE;
    this.queue = new Map(); // envelope_id → queue_entry
    this.fifo = []; // Ordered array of envelope_ids
    this.loaded = false;
    
    // Phase 4B: Backpressure handling
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.backpressureMode = options.backpressureMode || 'reject'; // 'reject' | 'wait'
    this.backpressureWaitTimeout = options.backpressureWaitTimeout || 30000; // 30s
    
    // Phase 4D: Execution deduplication
    this.executionAttempts = new Map(); // envelope_id → [attempt_timestamps]
    this.executionResults = new Map(); // envelope_id → result (for idempotency)
  }
  
  /**
   * Initialize queue (load from disk)
   */
  async initialize() {
    if (this.loaded) return;
    
    try {
      await fs.mkdir(path.dirname(this.queueFile), { recursive: true });
      
      const exists = await fs.access(this.queueFile).then(() => true).catch(() => false);
      
      if (exists) {
        await this._loadFromDisk();
      }
      
      this.loaded = true;
    } catch (error) {
      console.error('Failed to initialize execution queue:', error);
      throw error;
    }
  }
  
  /**
   * Enqueue envelope for execution
   * 
   * @param {object} envelope - Envelope to enqueue
   * @returns {string} queue_id
   */
  async enqueue(envelope) {
    if (!this.loaded) {
      await this.initialize();
    }
    
    // Phase 4B: Check backpressure
    const backpressureCheck = this._checkBackpressure();
    if (!backpressureCheck.allowed) {
      if (this.backpressureMode === 'reject') {
        throw new BackpressureError(
          backpressureCheck.reason,
          backpressureCheck.queueSize,
          backpressureCheck.maxSize
        );
      } else if (this.backpressureMode === 'wait') {
        // Wait for queue to drain (with timeout)
        await this._waitForQueueSpace();
      }
    }
    
    // Phase 4D: Check for duplicate envelope
    if (this.queue.has(envelope.envelope_id)) {
      const existing = this.queue.get(envelope.envelope_id);
      
      // If already completed, return cached result
      if (existing.state === QueueState.COMPLETED && this.executionResults.has(envelope.envelope_id)) {
        console.warn(`[ExecutionQueue] Duplicate envelope ${envelope.envelope_id} already completed, returning cached result`);
        return existing.queue_id;
      }
      
      // If already queued or executing, skip
      if (existing.state === QueueState.QUEUED || existing.state === QueueState.EXECUTING) {
        console.warn(`[ExecutionQueue] Duplicate envelope ${envelope.envelope_id} already ${existing.state}, skipping`);
        return existing.queue_id;
      }
    }
    
    const queueId = this._generateQueueId();
    const entry = {
      queue_id: queueId,
      envelope_id: envelope.envelope_id,
      envelope,
      state: QueueState.QUEUED,
      queued_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      retry_count: 0,
      last_error: null,
      blocking_reason: null
    };
    
    this.queue.set(envelope.envelope_id, entry);
    this.fifo.push(envelope.envelope_id);
    
    // Phase 4D: Record enqueue attempt
    this._recordExecutionAttempt(envelope.envelope_id, 'enqueued');
    
    await this._persist(entry);
    
    return queueId;
  }
  
  /**
   * Get next envelope to execute (FIFO)
   * 
   * @returns {object|null} Next envelope or null if queue empty
   */
  async next() {
    if (!this.loaded) {
      await this.initialize();
    }
    
    // Find first queued envelope
    for (const envelopeId of this.fifo) {
      const entry = this.queue.get(envelopeId);
      
      if (entry && entry.state === QueueState.QUEUED) {
        return entry.envelope;
      }
    }
    
    return null;
  }
  
  /**
   * Mark envelope as executing
   */
  async markExecuting(envelopeId) {
    const entry = this.queue.get(envelopeId);
    
    if (!entry) {
      throw new Error(`Envelope ${envelopeId} not in queue`);
    }
    
    // Phase 4D: Check if already executing (deduplication)
    if (entry.state === QueueState.EXECUTING) {
      console.warn(`[ExecutionQueue] Envelope ${envelopeId} already executing, skipping duplicate start`);
      return;
    }
    
    entry.state = QueueState.EXECUTING;
    entry.started_at = new Date().toISOString();
    
    // Phase 4D: Record execution start attempt
    this._recordExecutionAttempt(envelopeId, 'started');
    
    await this._persist(entry);
  }
  
  /**
   * Mark envelope as completed
   */
  async markCompleted(envelopeId, result) {
    const entry = this.queue.get(envelopeId);
    
    if (!entry) {
      throw new Error(`Envelope ${envelopeId} not in queue`);
    }
    
    entry.state = QueueState.COMPLETED;
    entry.completed_at = new Date().toISOString();
    entry.result = result;
    
    // Phase 4D: Cache result for idempotency
    this.executionResults.set(envelopeId, result);
    this._recordExecutionAttempt(envelopeId, 'completed');
    
    await this._persist(entry);
    
    // Remove from FIFO
    this.fifo = this.fifo.filter(id => id !== envelopeId);
  }
  
  /**
   * Mark envelope as failed
   */
  async markFailed(envelopeId, error) {
    const entry = this.queue.get(envelopeId);
    
    if (!entry) {
      throw new Error(`Envelope ${envelopeId} not in queue`);
    }
    
    entry.state = QueueState.FAILED;
    entry.completed_at = new Date().toISOString();
    entry.last_error = error.message || String(error);
    entry.retry_count = entry.retry_count + 1;
    
    await this._persist(entry);
  }
  
  /**
   * Mark envelope as blocked (recursion guard rejection)
   */
  async markBlocked(envelopeId, reason) {
    const entry = this.queue.get(envelopeId);
    
    if (!entry) {
      throw new Error(`Envelope ${envelopeId} not in queue`);
    }
    
    entry.state = QueueState.BLOCKED;
    entry.blocking_reason = reason;
    
    await this._persist(entry);
  }
  
  /**
   * Get queue entry by envelope ID
   */
  getEntry(envelopeId) {
    return this.queue.get(envelopeId);
  }
  
  /**
   * Get all entries in queue
   */
  getAllEntries() {
    return Array.from(this.queue.values());
  }
  
  /**
   * Get entries by state
   */
  getEntriesByState(state) {
    return Array.from(this.queue.values()).filter(e => e.state === state);
  }
  
  /**
   * Get queue statistics
   */
  getStats() {
    const entries = this.getAllEntries();
    
    return {
      total: entries.length,
      queued: entries.filter(e => e.state === QueueState.QUEUED).length,
      executing: entries.filter(e => e.state === QueueState.EXECUTING).length,
      completed: entries.filter(e => e.state === QueueState.COMPLETED).length,
      failed: entries.filter(e => e.state === QueueState.FAILED).length,
      blocked: entries.filter(e => e.state === QueueState.BLOCKED).length
    };
  }
  
  /**
   * Remove envelope from queue (for dead lettering)
   * 
   * @param {string} envelopeId - Envelope to remove
   */
  async remove(envelopeId) {
    const entry = this.queue.get(envelopeId);
    
    if (!entry) {
      return; // Already removed
    }
    
    // Remove from memory
    this.queue.delete(envelopeId);
    this.fifo = this.fifo.filter(id => id !== envelopeId);
    
    // Note: Entry remains in JSONL file for audit trail
    // Rebuild will clean it up if needed
  }
  
  /**
   * Clear completed entries (housekeeping)
   */
  async clearCompleted() {
    const completed = this.getEntriesByState(QueueState.COMPLETED);
    
    for (const entry of completed) {
      this.queue.delete(entry.envelope_id);
    }
    
    // Rebuild queue file (remove completed entries)
    await this._rebuildQueueFile();
  }
  
  /**
   * Persist queue entry to disk
   */
  async _persist(entry) {
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.queueFile, line);
  }
  
  /**
   * Load queue from disk
   */
  async _loadFromDisk() {
    try {
      const content = await fs.readFile(this.queueFile, 'utf8');
      const lines = content.trim().split('\n').filter(l => l);
      
      // Build map from all entries (later entries override earlier)
      const entryMap = new Map();
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          entryMap.set(entry.envelope_id, entry);
        } catch (error) {
          console.warn('Skipping invalid queue entry:', line);
        }
      }
      
      // Load into memory
      this.queue = entryMap;
      
      // Rebuild FIFO from queued entries (sorted by queued_at)
      const queuedEntries = Array.from(this.queue.values())
        .filter(e => e.state === QueueState.QUEUED)
        .sort((a, b) => new Date(a.queued_at) - new Date(b.queued_at));
      
      this.fifo = queuedEntries.map(e => e.envelope_id);
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist yet, start with empty queue
    }
  }
  
  /**
   * Rebuild queue file (remove duplicates and completed entries)
   */
  async _rebuildQueueFile() {
    const entries = this.getAllEntries();
    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
    
    await fs.writeFile(this.queueFile, lines);
  }
  
  /**
   * Generate queue ID
   */
  _generateQueueId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `queue_${timestamp}_${random}`;
  }
  
  /**
   * Phase 4B: Check backpressure condition
   * 
   * @returns {object} { allowed, reason, queueSize, maxSize }
   * @private
   */
  _checkBackpressure() {
    const queuedCount = this.getEntriesByState(QueueState.QUEUED).length;
    const executingCount = this.getEntriesByState(QueueState.EXECUTING).length;
    const activeCount = queuedCount + executingCount;
    
    if (activeCount >= this.maxQueueSize) {
      return {
        allowed: false,
        reason: `Queue full: ${activeCount} active envelopes (max: ${this.maxQueueSize})`,
        queueSize: activeCount,
        maxSize: this.maxQueueSize
      };
    }
    
    return {
      allowed: true,
      queueSize: activeCount,
      maxSize: this.maxQueueSize
    };
  }
  
  /**
   * Phase 4B: Wait for queue space (with timeout)
   * 
   * @returns {Promise<void>}
   * @private
   */
  async _waitForQueueSpace() {
    const startTime = Date.now();
    const checkInterval = 1000; // 1 second
    
    while (Date.now() - startTime < this.backpressureWaitTimeout) {
      const check = this._checkBackpressure();
      if (check.allowed) {
        return; // Space available
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Timeout reached
    throw new BackpressureError(
      `Queue backpressure timeout: waited ${this.backpressureWaitTimeout}ms`,
      this.getStats().queued + this.getStats().executing,
      this.maxQueueSize
    );
  }
  
  /**
   * Phase 4D: Record execution attempt
   * 
   * @param {string} envelopeId - Envelope ID
   * @param {string} event - Event type ('enqueued' | 'started' | 'completed')
   * @private
   */
  _recordExecutionAttempt(envelopeId, event) {
    if (!this.executionAttempts.has(envelopeId)) {
      this.executionAttempts.set(envelopeId, []);
    }
    
    this.executionAttempts.get(envelopeId).push({
      event,
      timestamp: Date.now()
    });
  }
  
  /**
   * Phase 4D: Get execution attempts for envelope
   * 
   * @param {string} envelopeId - Envelope ID
   * @returns {Array<object>} Attempt history
   */
  getExecutionAttempts(envelopeId) {
    return this.executionAttempts.get(envelopeId) || [];
  }
  
  /**
   * Phase 4D: Check if envelope already executed successfully
   * 
   * @param {string} envelopeId - Envelope ID
   * @returns {boolean} True if already executed
   */
  isAlreadyExecuted(envelopeId) {
    return this.executionResults.has(envelopeId);
  }
  
  /**
   * Phase 4D: Get cached execution result (idempotency)
   * 
   * @param {string} envelopeId - Envelope ID
   * @returns {object|null} Cached result
   */
  getCachedResult(envelopeId) {
    return this.executionResults.get(envelopeId) || null;
  }
}

/**
 * Phase 4B: Backpressure error
 */
class BackpressureError extends Error {
  constructor(message, queueSize, maxSize) {
    super(message);
    this.name = 'BackpressureError';
    this.queueSize = queueSize;
    this.maxSize = maxSize;
    this.code = 'QUEUE_BACKPRESSURE';
  }
}

module.exports = { ExecutionQueue, QueueState, BackpressureError };
