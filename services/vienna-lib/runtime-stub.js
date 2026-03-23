/**
 * Vienna Runtime Stub
 * 
 * Minimal shim for console server compatibility.
 * Real governance lives in individual modules (intent-gateway, executor, etc.)
 */

module.exports = {
  init(config) {
    console.log('[Runtime Stub] Initialized with config:', config);
    // No-op - real initialization happens per-module
  },
  
  // Stub properties expected by ViennaRuntimeService
  queuedExecutor: null,
  deadLetterQueue: null
};
