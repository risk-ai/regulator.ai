/**
 * Vienna Runtime Stub
 * 
 * Minimal shim for console server compatibility.
 * Real governance lives in individual modules (intent-gateway, executor, etc.)
 */

const startTime = Date.now();

// Minimal queued executor stub
const queuedExecutorStub = {
  connectEventStream(eventStream) {
    console.log('[Stub] Event stream connected');
  },
  
  getHealth() {
    return {
      status: 'degraded',
      reason: 'Runtime stub (not full Vienna Core)',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    };
  },
  
  getQueueState() {
    return {
      pending: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
  },
  
  getExecutionControlState() {
    return {
      paused: false,
      kill_switch_active: false,
      pause_reason: null,
      kill_switch_reason: null,
    };
  },
  
  getServiceHealth(serviceName) {
    return {
      service: serviceName,
      status: 'unknown',
      health: 'unknown',
      last_check: null,
    };
  },
};

// Minimal dead letter queue stub
const deadLetterQueueStub = {
  getStats() {
    return {
      total: 0,
      by_state: {},
    };
  },
  
  listItems(options) {
    return {
      items: [],
      total: 0,
      hasMore: false,
    };
  },
  
  clear() {
    return { cleared: 0 };
  },
};

module.exports = {
  init(config) {
    console.log('[Runtime Stub] Initialized with config:', config);
    // No-op - real initialization happens per-module
  },
  
  // Stub properties expected by ViennaRuntimeService
  queuedExecutor: queuedExecutorStub,
  deadLetterQueue: deadLetterQueueStub,
};
