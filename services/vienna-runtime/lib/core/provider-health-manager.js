/**
 * Provider Health Manager
 * Phase 6B: Provider Health Enforcement
 * 
 * Makes provider health authoritative - blocks execution on unhealthy providers.
 * 
 * Features:
 * - Provider quarantine after consecutive failures
 * - Cooldown timers before recovery attempts
 * - Health gating before execution
 * - Provider recovery tracking
 * - Structured health events
 */

class ProviderHealthManager {
  constructor(options = {}) {
    // Configuration
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
    this.quarantineDurationMs = options.quarantineDurationMs || 300000; // 5 minutes
    this.cooldownDurationMs = options.cooldownDurationMs || 60000; // 1 minute
    this.healthCheckIntervalMs = options.healthCheckIntervalMs || 30000; // 30 seconds
    this.staleTelemetryThresholdMs = options.staleTelemetryThresholdMs || 120000; // 2 minutes
    
    // State tracking
    this.providers = new Map(); // provider_name → health_state
    this.quarantined = new Set(); // Set of quarantined provider names
    this.eventEmitter = null; // Set by ViennaCore
    
    // Phase 7.2: State Graph integration
    this.stateGraph = null; // Set by ViennaCore
    this.stateGraphWritesEnabled = false; // Set via setStateGraph
    
    // Monitoring
    this.healthCheckTimer = null;
    this.running = false;
  }
  
  /**
   * Set event emitter for health events
   */
  setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }
  
  /**
   * Set State Graph for persistent storage (Phase 7.2)
   * 
   * @param {StateGraph} stateGraph - State Graph instance
   * @param {boolean} writesEnabled - Enable State Graph writes (default: false)
   */
  setStateGraph(stateGraph, writesEnabled = false) {
    this.stateGraph = stateGraph;
    this.stateGraphWritesEnabled = writesEnabled && stateGraph !== null;
    
    if (this.stateGraphWritesEnabled) {
      console.log('[ProviderHealthManager] State Graph writes enabled');
    }
  }
  
  /**
   * Write provider state to State Graph (Phase 7.2 Stage 2)
   * 
   * Non-blocking: logs and continues on failure.
   * Idempotent: safe to call repeatedly with same data.
   * 
   * @param {string} name - Provider name
   * @param {object} state - Provider health state
   */
  async _writeProviderState(name, state) {
    if (!this.stateGraphWritesEnabled) return;
    
    try {
      // Idempotent update (upsert behavior)
      await this.stateGraph.updateProvider(name, {
        status: this._mapStateToStatus(state.status),
        health: this._mapStateToHealth(state.status),
        last_health_check: state.lastHealthCheck,
        error_count: state.totalFailures,
        last_error_at: state.lastFailure,
        metadata: {
          consecutive_failures: state.consecutiveFailures,
          consecutive_successes: state.consecutiveSuccesses,
          quarantined: this.isQuarantined(name),
          quarantine_until: state.quarantineUntil,
          cooldown_until: state.cooldownUntil,
          total_requests: state.totalRequests,
          total_successes: state.totalSuccesses,
          total_failures: state.totalFailures
        }
      }, 'runtime');
    } catch (error) {
      // Non-blocking: log and continue
      console.warn(`[ProviderHealthManager] Failed to write provider ${name} to State Graph:`, error.message);
    }
  }
  
  /**
   * Map internal status to State Graph status enum
   */
  _mapStateToStatus(status) {
    const mapping = {
      'healthy': 'active',
      'degraded': 'degraded',
      'unhealthy': 'degraded',
      'quarantined': 'failed',
      'unknown': 'inactive'
    };
    return mapping[status] || 'inactive';
  }
  
  /**
   * Map internal status to State Graph health enum
   */
  _mapStateToHealth(status) {
    const mapping = {
      'healthy': 'healthy',
      'degraded': 'unhealthy',
      'unhealthy': 'unhealthy',
      'quarantined': 'unhealthy',
      'unknown': 'unhealthy'
    };
    return mapping[status] || 'unhealthy';
  }
  
  /**
   * Register a provider for health management
   * 
   * @param {string} name - Provider name
   * @param {object} provider - Provider instance
   */
  registerProvider(name, provider) {
    const now = new Date().toISOString();
    
    this.providers.set(name, {
      name,
      provider,
      status: 'unknown',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthCheck: null,
      lastSuccess: null,
      lastFailure: null,
      quarantinedAt: null,
      quarantineUntil: null,
      cooldownUntil: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      registeredAt: now
    });
    
    console.log(`[ProviderHealthManager] Registered provider: ${name}`);
  }
  
  /**
   * Start health monitoring
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    console.log('[ProviderHealthManager] Starting health monitoring');
    
    // Run initial health check
    this.runHealthChecks();
    
    // Schedule periodic checks
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.healthCheckIntervalMs);
  }
  
  /**
   * Stop health monitoring
   */
  stop() {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('[ProviderHealthManager] Stopped health monitoring');
  }
  
  /**
   * Reconcile State Graph with actual provider health (Phase 7.2 Stage 2)
   * 
   * Called on startup to ensure State Graph matches current provider state.
   * Runs fresh health checks and writes results.
   */
  async reconcileStateGraph() {
    if (!this.stateGraphWritesEnabled) return;
    
    console.log('[ProviderHealthManager] Reconciling State Graph with provider health');
    
    for (const [name, state] of this.providers.entries()) {
      try {
        // Run health check
        const isHealthy = await state.provider.isHealthy?.();
        const now = new Date().toISOString();
        
        state.lastHealthCheck = now;
        
        if (isHealthy !== false) {
          state.status = 'healthy';
          state.consecutiveFailures = 0;
        } else {
          state.status = 'unhealthy';
        }
        
        // Write current state
        await this._writeProviderState(name, state);
      } catch (error) {
        console.warn(`[ProviderHealthManager] Reconciliation failed for ${name}:`, error.message);
        state.status = 'unhealthy';
        await this._writeProviderState(name, state);
      }
    }
    
    console.log('[ProviderHealthManager] State Graph reconciliation complete');
  }
  
  /**
   * Run health checks on all providers
   */
  async runHealthChecks() {
    const now = Date.now();
    
    for (const [name, state] of this.providers.entries()) {
      // Skip quarantined providers unless quarantine expired
      if (this.isQuarantined(name)) {
        if (!this.hasQuarantineExpired(name)) {
          continue;
        }
        // Quarantine expired, attempt recovery
        await this.attemptRecovery(name);
      }
      
      // Skip if in cooldown
      if (this.isInCooldown(name)) {
        continue;
      }
      
      // Run health check
      try {
        const isHealthy = await state.provider.isHealthy?.();
        const timestamp = new Date().toISOString();
        
        state.lastHealthCheck = timestamp;
        
        if (isHealthy !== false) {
          // Provider healthy or no health check method
          await this.recordSuccess(name);
        } else {
          await this.recordFailure(name, new Error('Health check returned false'));
        }
      } catch (error) {
        await this.recordFailure(name, error);
      }
    }
    
    // Check for stale telemetry
    this.checkStaleTelemetry();
  }
  
  /**
   * Check if a provider can be used for execution
   * 
   * @param {string} name - Provider name
   * @returns {object} Availability check result
   */
  checkAvailability(name) {
    const state = this.providers.get(name);
    
    if (!state) {
      return {
        available: false,
        reason: 'provider_not_registered',
        action: 'reject'
      };
    }
    
    // Check quarantine
    if (this.isQuarantined(name) && !this.hasQuarantineExpired(name)) {
      const remainingMs = new Date(state.quarantineUntil).getTime() - Date.now();
      
      return {
        available: false,
        reason: 'provider_quarantined',
        action: 'retry_later',
        metadata: {
          quarantined_at: state.quarantinedAt,
          quarantine_until: state.quarantineUntil,
          remaining_ms: remainingMs
        }
      };
    }
    
    // Check cooldown
    if (this.isInCooldown(name)) {
      const remainingMs = new Date(state.cooldownUntil).getTime() - Date.now();
      
      return {
        available: false,
        reason: 'provider_cooldown',
        action: 'retry_later',
        metadata: {
          cooldown_until: state.cooldownUntil,
          remaining_ms: remainingMs
        }
      };
    }
    
    // Check status
    if (state.status === 'unhealthy') {
      return {
        available: false,
        reason: 'provider_unhealthy',
        action: 'use_fallback',
        metadata: {
          consecutive_failures: state.consecutiveFailures,
          last_failure: state.lastFailure
        }
      };
    }
    
    // Check telemetry freshness
    if (this.hasStaleTelemetry(name)) {
      return {
        available: false,
        reason: 'stale_telemetry',
        action: 'degraded_mode',
        metadata: {
          last_health_check: state.lastHealthCheck
        }
      };
    }
    
    // Available
    return {
      available: true,
      reason: null,
      action: null,
      metadata: {
        status: state.status,
        consecutive_successes: state.consecutiveSuccesses
      }
    };
  }
  
  /**
   * Record successful provider operation
   * 
   * @param {string} name - Provider name
   * @param {number} latencyMs - Operation latency (optional)
   */
  async recordSuccess(name, latencyMs = null) {
    const state = this.providers.get(name);
    if (!state) return;
    
    const now = new Date().toISOString();
    
    state.consecutiveFailures = 0;
    state.consecutiveSuccesses++;
    state.totalSuccesses++;
    state.totalRequests++;
    state.lastSuccess = now;
    state.lastHealthCheck = now; // Update health check timestamp
    state.status = 'healthy';
    state.cooldownUntil = null;
    
    // If was quarantined, emit recovery event
    if (this.isQuarantined(name)) {
      this.quarantined.delete(name);
      state.quarantinedAt = null;
      state.quarantineUntil = null;
      
      this.emitProviderEvent('provider.recovered', {
        provider: name,
        previous_status: 'quarantined',
        consecutive_successes: state.consecutiveSuccesses
      });
      
      console.log(`[ProviderHealthManager] Provider ${name} recovered from quarantine`);
    }
    
    // Phase 7.2 Stage 2: Write to State Graph
    await this._writeProviderState(name, state);
  }
  
  /**
   * Record provider failure
   * 
   * @param {string} name - Provider name
   * @param {Error} error - Error details
   */
  async recordFailure(name, error) {
    const state = this.providers.get(name);
    if (!state) return;
    
    const now = new Date().toISOString();
    
    state.consecutiveFailures++;
    state.consecutiveSuccesses = 0;
    state.totalFailures++;
    state.totalRequests++;
    state.lastFailure = now;
    state.lastHealthCheck = now; // Update health check timestamp
    
    console.warn(
      `[ProviderHealthManager] Provider ${name} failure ` +
      `(${state.consecutiveFailures}/${this.maxConsecutiveFailures}): ${error.message}`
    );
    
    // Check if threshold reached
    if (state.consecutiveFailures >= this.maxConsecutiveFailures) {
      await this.quarantineProvider(name);
    } else {
      // Mark degraded and apply cooldown
      state.status = 'degraded';
      state.cooldownUntil = new Date(Date.now() + this.cooldownDurationMs).toISOString();
      
      this.emitProviderEvent('provider.degraded', {
        provider: name,
        consecutive_failures: state.consecutiveFailures,
        threshold: this.maxConsecutiveFailures,
        cooldown_until: state.cooldownUntil
      });
    }
    
    // Phase 7.2 Stage 2: Write to State Graph
    await this._writeProviderState(name, state);
  }
  
  /**
   * Quarantine a provider after repeated failures
   * 
   * @param {string} name - Provider name
   */
  async quarantineProvider(name) {
    const state = this.providers.get(name);
    if (!state) return;
    
    const now = new Date().toISOString();
    const quarantineUntil = new Date(Date.now() + this.quarantineDurationMs).toISOString();
    
    state.status = 'quarantined';
    state.quarantinedAt = now;
    state.quarantineUntil = quarantineUntil;
    this.quarantined.add(name);
    
    this.emitProviderEvent('provider.quarantined', {
      provider: name,
      consecutive_failures: state.consecutiveFailures,
      quarantined_at: now,
      quarantine_until: quarantineUntil,
      quarantine_duration_ms: this.quarantineDurationMs
    });
    
    console.error(
      `[ProviderHealthManager] Provider ${name} QUARANTINED until ${quarantineUntil} ` +
      `(${state.consecutiveFailures} consecutive failures)`
    );
    
    // Phase 7.2 Stage 2: Write to State Graph
    await this._writeProviderState(name, state);
  }
  
  /**
   * Attempt to recover a quarantined provider
   * 
   * @param {string} name - Provider name
   */
  async attemptRecovery(name) {
    const state = this.providers.get(name);
    if (!state) return;
    
    console.log(`[ProviderHealthManager] Attempting recovery for ${name}`);
    
    try {
      const isHealthy = await state.provider.isHealthy?.();
      
      if (isHealthy !== false) {
        // Recovery successful
        this.quarantined.delete(name);
        state.status = 'healthy';
        state.quarantinedAt = null;
        state.quarantineUntil = null;
        state.consecutiveFailures = 0;
        state.consecutiveSuccesses = 1;
        state.lastSuccess = new Date().toISOString();
        
        this.emitProviderEvent('provider.recovered', {
          provider: name,
          previous_status: 'quarantined',
          recovery_method: 'automatic'
        });
        
        console.log(`[ProviderHealthManager] Provider ${name} recovered successfully`);
        
        // Phase 7.2 Stage 2: Write to State Graph
        await this._writeProviderState(name, state);
      } else {
        // Still unhealthy, extend quarantine
        const newQuarantineUntil = new Date(Date.now() + this.quarantineDurationMs).toISOString();
        state.quarantineUntil = newQuarantineUntil;
        
        this.emitProviderEvent('provider.recovery_failed', {
          provider: name,
          new_quarantine_until: newQuarantineUntil
        });
        
        console.warn(`[ProviderHealthManager] Provider ${name} recovery failed, quarantine extended`);
        
        // Phase 7.2 Stage 2: Write to State Graph
        await this._writeProviderState(name, state);
      }
    } catch (error) {
      // Recovery check failed, extend quarantine
      const newQuarantineUntil = new Date(Date.now() + this.quarantineDurationMs).toISOString();
      state.quarantineUntil = newQuarantineUntil;
      
      this.emitProviderEvent('provider.recovery_failed', {
        provider: name,
        error: error.message,
        new_quarantine_until: newQuarantineUntil
      });
      
      console.warn(`[ProviderHealthManager] Provider ${name} recovery check failed:`, error.message);
      
      // Phase 7.2 Stage 2: Write to State Graph
      await this._writeProviderState(name, state);
    }
  }
  
  /**
   * Check if provider is quarantined
   */
  isQuarantined(name) {
    return this.quarantined.has(name);
  }
  
  /**
   * Check if quarantine has expired
   */
  hasQuarantineExpired(name) {
    const state = this.providers.get(name);
    if (!state || !state.quarantineUntil) return true;
    
    return new Date() >= new Date(state.quarantineUntil);
  }
  
  /**
   * Check if provider is in cooldown
   */
  isInCooldown(name) {
    const state = this.providers.get(name);
    if (!state || !state.cooldownUntil) return false;
    
    return new Date() < new Date(state.cooldownUntil);
  }
  
  /**
   * Check if provider has stale telemetry
   */
  hasStaleTelemetry(name) {
    const state = this.providers.get(name);
    if (!state || !state.lastHealthCheck) return true;
    
    const lastCheck = new Date(state.lastHealthCheck);
    const age = Date.now() - lastCheck.getTime();
    
    return age > this.staleTelemetryThresholdMs;
  }
  
  /**
   * Check all providers for stale telemetry
   */
  checkStaleTelemetry() {
    const now = Date.now();
    
    for (const [name, state] of this.providers.entries()) {
      if (this.hasStaleTelemetry(name) && state.status !== 'quarantined') {
        const age = state.lastHealthCheck
          ? now - new Date(state.lastHealthCheck).getTime()
          : null;
        
        this.emitProviderEvent('provider.telemetry_stale', {
          provider: name,
          last_health_check: state.lastHealthCheck,
          age_ms: age,
          threshold_ms: this.staleTelemetryThresholdMs
        });
      }
    }
  }
  
  /**
   * Get health status for a provider
   */
  getHealth(name) {
    const state = this.providers.get(name);
    if (!state) return null;
    
    return {
      provider: name,
      status: state.status,
      consecutive_failures: state.consecutiveFailures,
      consecutive_successes: state.consecutiveSuccesses,
      last_health_check: state.lastHealthCheck,
      last_success: state.lastSuccess,
      last_failure: state.lastFailure,
      quarantined: this.isQuarantined(name),
      quarantine_until: state.quarantineUntil,
      cooldown_until: state.cooldownUntil,
      in_cooldown: this.isInCooldown(name),
      stale_telemetry: this.hasStaleTelemetry(name),
      total_requests: state.totalRequests,
      total_successes: state.totalSuccesses,
      total_failures: state.totalFailures,
      error_rate: state.totalRequests > 0
        ? state.totalFailures / state.totalRequests
        : null
    };
  }
  
  /**
   * Get health for all providers
   */
  getAllHealth() {
    const health = {};
    
    for (const name of this.providers.keys()) {
      health[name] = this.getHealth(name);
    }
    
    return health;
  }
  
  /**
   * Emit provider health event
   */
  emitProviderEvent(eventType, data) {
    if (!this.eventEmitter) return;
    
    try {
      this.eventEmitter.emitAlert(eventType, {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[ProviderHealthManager] Failed to emit event:', error);
    }
  }
  
  /**
   * Get runtime health summary
   */
  getRuntimeHealth() {
    const allHealth = this.getAllHealth();
    const providers = Object.values(allHealth);
    
    const healthy = providers.filter(p => p.status === 'healthy').length;
    const degraded = providers.filter(p => p.status === 'degraded').length;
    const quarantined = providers.filter(p => p.quarantined).length;
    const unknown = providers.filter(p => p.status === 'unknown').length;
    
    return {
      total_providers: providers.length,
      healthy_count: healthy,
      degraded_count: degraded,
      quarantined_count: quarantined,
      unknown_count: unknown,
      runtime_status: this.getRuntimeStatus(providers)
    };
  }
  
  /**
   * Determine overall runtime status
   */
  getRuntimeStatus(providers) {
    if (providers.length === 0) return 'no_providers';
    
    const healthy = providers.filter(p => p.status === 'healthy').length;
    const degraded = providers.filter(p => p.status === 'degraded').length;
    const quarantined = providers.filter(p => p.quarantined).length;
    const unhealthy = providers.filter(p => p.status === 'unhealthy').length;
    
    // No healthy providers = critical
    if (healthy === 0) return 'critical';
    
    // Any degraded, quarantined, or unhealthy = degraded runtime
    if (quarantined > 0 || degraded > 0 || unhealthy > 0) return 'degraded';
    
    // All healthy = operational
    if (healthy === providers.length) return 'operational';
    
    return 'degraded';
  }
}

module.exports = { ProviderHealthManager };
