/**
 * Vienna Core - Main Entry Point
 * Provides initialization and module re-exports
 */

// Re-export all Vienna Core modules
export * from './lib/governance/warrant.js';
export * from './lib/governance/risk-tier.js';
export * from './lib/governance/trading-guard.js';
export * from './lib/core/chat-action-bridge.js';
export * from './lib/core/intent-gateway.js';
export * from './lib/core/plan-generator.js';
export * from './lib/core/verification-engine.js';
export * from './lib/core/approval-manager.js';
export * from './lib/state/state-graph.js';
export * from './lib/execution/executor.js';
export * from './lib/execution/shell-executor.js';

/**
 * Vienna Core initialization
 */
class ViennaCore {
  constructor() {
    this.initialized = false;
    this.config = null;
  }

  /**
   * Initialize Vienna Core runtime
   */
  init(config = {}) {
    if (this.initialized) {
      console.log('Vienna Core already initialized');
      return;
    }

    this.config = config;
    this.initialized = true;

    console.log('Vienna Core initialized', {
      adapter: config.adapter || 'default',
      workspace: config.workspace || 'default',
    });

    return this;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Check if initialized
   */
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance as default
const viennaCoreInstance = new ViennaCore();
export default viennaCoreInstance;
