/**
 * Provider Health Bridge (Phase 6.5)
 * 
 * Bridges ProviderHealthManager (Phase 6B) to RuntimeModeManager (Phase 6.5).
 * 
 * Responsibilities:
 * - Convert ProviderHealthManager state to RuntimeModeManager format
 * - Trigger runtime mode updates on provider health changes
 * - Maintain gateway connectivity awareness
 */

/**
 * Convert ProviderHealthManager state to RuntimeModeManager format
 * 
 * @param {Map} providerHealthManagerState - State from ProviderHealthManager
 * @returns {Map<string, object>} Provider health in RuntimeModeManager format
 */
function convertProviderHealth(providerHealthManagerState) {
  const converted = new Map();
  
  for (const [name, state] of providerHealthManagerState.entries()) {
    // Map ProviderHealthManager status to RuntimeModeManager status
    let status = 'unknown';
    
    if (state.status === 'healthy') {
      status = 'healthy';
    } else if (state.status === 'degraded') {
      status = 'degraded';
    } else if (state.status === 'unhealthy') {
      status = 'unavailable';
    } else if (state.status === 'unknown') {
      status = 'unknown';
    }
    
    // Build RuntimeModeManager-compatible health object
    converted.set(name, {
      provider: name,
      status,
      lastCheckedAt: state.lastHealthCheck || new Date().toISOString(),
      lastSuccessAt: state.lastSuccess,
      lastFailureAt: state.lastFailure,
      cooldownUntil: state.cooldownUntil,
      latencyMs: null, // TODO: Track latency in ProviderHealthManager
      errorRate: state.totalRequests > 0 
        ? state.totalFailures / state.totalRequests 
        : null,
      consecutiveFailures: state.consecutiveFailures,
    });
  }
  
  return converted;
}

/**
 * Check if gateway is connected
 * 
 * @returns {Promise<boolean>} True if gateway connected
 */
async function checkGatewayConnected() {
  // TODO: Implement actual gateway health check
  // For now, assume connected if we can reach it
  try {
    // Check for OpenClaw gateway process
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Quick check: is port 18789 listening?
    const result = await execAsync('netstat -tuln 2>/dev/null | grep :18789 || ss -tuln 2>/dev/null | grep :18789 || echo "not_found"');
    
    return !result.stdout.includes('not_found');
  } catch (error) {
    console.warn('[ProviderHealthBridge] Gateway check failed:', error.message);
    return false; // Assume disconnected on error
  }
}

/**
 * Provider Health Bridge
 * 
 * Connects ProviderHealthManager to RuntimeModeManager with automatic updates.
 */
class ProviderHealthBridge {
  constructor(providerHealthManager, runtimeModeManager, options = {}) {
    this.providerHealthManager = providerHealthManager;
    this.runtimeModeManager = runtimeModeManager;
    
    // Configuration
    this.updateIntervalMs = options.updateIntervalMs || 30000; // 30 seconds
    this.gatewayCheckIntervalMs = options.gatewayCheckIntervalMs || 60000; // 1 minute
    
    // State
    this.updateTimer = null;
    this.gatewayCheckTimer = null;
    this.gatewayConnected = true; // Assume connected initially
    this.running = false;
    
    // Event emitter (for logging transitions)
    this.eventEmitter = options.eventEmitter || null;
    this.logger = options.logger || null;
  }
  
  /**
   * Start automatic runtime mode updates
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    console.log('[ProviderHealthBridge] Starting automatic runtime mode updates');
    
    // Run initial update
    this.updateRuntimeMode();
    
    // Schedule periodic updates
    this.updateTimer = setInterval(() => {
      this.updateRuntimeMode();
    }, this.updateIntervalMs);
    
    // Schedule gateway checks
    this.gatewayCheckTimer = setInterval(() => {
      this.checkGateway();
    }, this.gatewayCheckIntervalMs);
  }
  
  /**
   * Stop automatic runtime mode updates
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.gatewayCheckTimer) {
      clearInterval(this.gatewayCheckTimer);
      this.gatewayCheckTimer = null;
    }
    
    console.log('[ProviderHealthBridge] Stopped automatic runtime mode updates');
  }
  
  /**
   * Update runtime mode based on current provider health
   */
  async updateRuntimeMode() {
    try {
      // Get provider health from ProviderHealthManager
      const rawHealth = this.providerHealthManager.providers;
      
      if (!rawHealth || rawHealth.size === 0) {
        console.warn('[ProviderHealthBridge] No providers registered, skipping update');
        return;
      }
      
      // Convert to RuntimeModeManager format
      const providerHealth = convertProviderHealth(rawHealth);
      
      // Update runtime mode
      const transition = this.runtimeModeManager.updateMode(
        providerHealth,
        this.gatewayConnected
      );
      
      // Log transition if occurred
      if (transition) {
        console.log(`[ProviderHealthBridge] Runtime mode transition: ${transition.from} → ${transition.to}`);
        
        // Emit event if available (check for emit method compatibility)
        if (this.eventEmitter && typeof this.eventEmitter.emit === 'function') {
          this.eventEmitter.emit('runtime_mode_transition', transition);
        }
        
        // Log to structured logger if available
        if (this.logger) {
          this.logger.log('runtime_mode_transition', {
            from: transition.from,
            to: transition.to,
            reason: transition.reason,
            automatic: transition.automatic,
          });
        }
      }
    } catch (error) {
      console.error('[ProviderHealthBridge] Failed to update runtime mode:', error);
    }
  }
  
  /**
   * Check gateway connectivity
   */
  async checkGateway() {
    try {
      const connected = await checkGatewayConnected();
      
      if (connected !== this.gatewayConnected) {
        console.log(`[ProviderHealthBridge] Gateway connectivity changed: ${this.gatewayConnected} → ${connected}`);
        this.gatewayConnected = connected;
        
        // Trigger immediate runtime mode update
        await this.updateRuntimeMode();
      }
    } catch (error) {
      console.error('[ProviderHealthBridge] Gateway check failed:', error);
    }
  }
  
  /**
   * Get current provider health (in RuntimeModeManager format)
   * 
   * @returns {Map<string, object>}
   */
  getProviderHealth() {
    const rawHealth = this.providerHealthManager.providers;
    return convertProviderHealth(rawHealth);
  }
  
  /**
   * Get current runtime mode state
   * 
   * @returns {object}
   */
  getRuntimeModeState() {
    return this.runtimeModeManager.getCurrentState();
  }
  
  /**
   * Force runtime mode (operator override)
   * 
   * @param {string} mode - Target mode
   * @param {string} reason - Reason for override
   * @returns {object} Transition record
   */
  async forceMode(mode, reason) {
    const providerHealth = this.getProviderHealth();
    const transition = this.runtimeModeManager.forceMode(mode, reason, providerHealth);
    
    // Emit event
    if (this.eventEmitter) {
      this.eventEmitter.emit('runtime_mode_transition', transition);
    }
    
    // Log
    if (this.logger) {
      this.logger.log('runtime_mode_transition', {
        from: transition.from,
        to: transition.to,
        reason: transition.reason,
        automatic: transition.automatic,
      });
    }
    
    return transition;
  }
}

module.exports = {
  ProviderHealthBridge,
  convertProviderHealth,
  checkGatewayConnected,
};
