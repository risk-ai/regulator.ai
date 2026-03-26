/**
 * Phase 7.4 Stage 2: Proposal and Execution Rate Limiting
 * 
 * Purpose: Prevent envelope floods from destabilizing queue and executor.
 * 
 * Design:
 * - Per-agent limits
 * - Global limits
 * - Per-objective limits
 * - Rate limiting occurs before queue insertion
 * - Rate-limited proposals remain visible in audit history
 */

class RateLimiter {
  constructor(policy = {}) {
    this.policy = {
      max_envelopes_per_minute_per_agent: policy.max_envelopes_per_minute_per_agent || 10,
      max_envelopes_per_minute_global: policy.max_envelopes_per_minute_global || 30,
      max_envelopes_per_minute_per_objective: policy.max_envelopes_per_minute_per_objective || 15,
      max_envelopes_per_minute_per_tenant: policy.max_envelopes_per_minute_per_tenant || 50,
      
      // Sliding window configuration
      window_size_ms: policy.window_size_ms || 60 * 1000, // Default 1 minute
      num_window_buckets: policy.num_window_buckets || 6, // 6 buckets = 10s per bucket
      
      // Burst allowance configuration
      burst_allowance_ratio: policy.burst_allowance_ratio || 2.0, // 2x normal rate for burst
      burst_window_ms: policy.burst_window_ms || 10 * 1000 // 10 seconds
    };
    
    // Sliding window tracking using bucketed approach
    this.agentWindows = new Map(); // agent_id → SlidingWindow
    this.tenantWindows = new Map(); // tenant_id → SlidingWindow  
    this.globalWindow = new SlidingWindow(this.policy);
    this.objectiveWindows = new Map(); // objective_id → SlidingWindow
    
    // Legacy fixed window duration for backward compatibility
    this.windowMs = this.policy.window_size_ms;
  }
  
  /**
   * Check if envelope can be admitted
   * 
   * @param {object} envelope - Envelope to check
   * @returns {object} { allowed: boolean, reason?: string, scope?: string }
   */
  checkAdmission(envelope) {
    const now = Date.now();
    const agentId = envelope.proposed_by || 'unknown';
    const tenantId = envelope.tenant_id || 'default';
    const objectiveId = envelope.objective_id;
    
    // Clean old entries first (for backward compatibility with fixed windows)
    this._cleanupWindows(now);
    
    // Check global limit with sliding window
    const globalCount = this.globalWindow.getCount(now);
    const globalLimit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_global, now);
    if (globalCount >= globalLimit) {
      return {
        allowed: false,
        reason: `Global rate limit exceeded: ${globalCount}/${globalLimit} per minute`,
        scope: 'global',
        limit_type: 'GLOBAL_RATE_LIMIT',
        current_count: globalCount,
        limit: globalLimit
      };
    }

    // Check per-tenant limit
    const tenantWindow = this._getTenantWindow(tenantId);
    const tenantCount = tenantWindow.getCount(now);
    const tenantLimit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_tenant, now);
    if (tenantCount >= tenantLimit) {
      return {
        allowed: false,
        reason: `Tenant rate limit exceeded: ${tenantCount}/${tenantLimit} per minute for tenant ${tenantId}`,
        scope: 'tenant',
        tenant_id: tenantId,
        limit_type: 'TENANT_RATE_LIMIT',
        current_count: tenantCount,
        limit: tenantLimit
      };
    }
    
    // Check per-agent limit with sliding window
    const agentWindow = this._getAgentWindow(agentId);
    const agentCount = agentWindow.getCount(now);
    const agentLimit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_agent, now);
    if (agentCount >= agentLimit) {
      return {
        allowed: false,
        reason: `Agent rate limit exceeded: ${agentCount}/${agentLimit} per minute for agent ${agentId}`,
        scope: 'agent',
        agent_id: agentId,
        limit_type: 'AGENT_RATE_LIMIT',
        current_count: agentCount,
        limit: agentLimit
      };
    }
    
    // Check per-objective limit with sliding window
    if (objectiveId) {
      const objectiveWindow = this._getObjectiveWindow(objectiveId);
      const objectiveCount = objectiveWindow.getCount(now);
      const objectiveLimit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_objective, now);
      if (objectiveCount >= objectiveLimit) {
        return {
          allowed: false,
          reason: `Objective rate limit exceeded: ${objectiveCount}/${objectiveLimit} per minute for objective ${objectiveId}`,
          scope: 'objective',
          objective_id: objectiveId,
          limit_type: 'OBJECTIVE_RATE_LIMIT',
          current_count: objectiveCount,
          limit: objectiveLimit
        };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Record admission (call after envelope accepted)
   * 
   * @param {object} envelope - Envelope that was admitted
   */
  recordAdmission(envelope) {
    const now = Date.now();
    const agentId = envelope.proposed_by || 'unknown';
    const tenantId = envelope.tenant_id || 'default';
    const objectiveId = envelope.objective_id;
    
    // Record in sliding windows
    this.globalWindow.record(now);
    this._getAgentWindow(agentId).record(now);
    this._getTenantWindow(tenantId).record(now);
    
    if (objectiveId) {
      this._getObjectiveWindow(objectiveId).record(now);
    }
  }
  
  /**
   * Get current rate limit state
   * 
   * @returns {object} Current window state
   */
  getState() {
    const now = Date.now();
    this._cleanupWindows(now);
    
    const agentStats = {};
    for (const [agentId, window] of this.agentWindows.entries()) {
      const count = window.getCount(now);
      const limit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_agent, now);
      agentStats[agentId] = {
        count,
        limit,
        remaining: Math.max(0, limit - count),
        burst_available: this._getBurstCapacity(limit, now) - count
      };
    }

    const tenantStats = {};
    for (const [tenantId, window] of this.tenantWindows.entries()) {
      const count = window.getCount(now);
      const limit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_tenant, now);
      tenantStats[tenantId] = {
        count,
        limit,
        remaining: Math.max(0, limit - count),
        burst_available: this._getBurstCapacity(limit, now) - count
      };
    }
    
    const objectiveStats = {};
    for (const [objectiveId, window] of this.objectiveWindows.entries()) {
      const count = window.getCount(now);
      const limit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_per_objective, now);
      objectiveStats[objectiveId] = {
        count,
        limit,
        remaining: Math.max(0, limit - count),
        burst_available: this._getBurstCapacity(limit, now) - count
      };
    }

    const globalCount = this.globalWindow.getCount(now);
    const globalLimit = this._getEffectiveLimit(this.policy.max_envelopes_per_minute_global, now);
    
    return {
      global: {
        count: globalCount,
        limit: globalLimit,
        remaining: Math.max(0, globalLimit - globalCount),
        burst_available: this._getBurstCapacity(globalLimit, now) - globalCount
      },
      agents: agentStats,
      tenants: tenantStats,
      objectives: objectiveStats,
      policy: { ...this.policy },
      window_type: 'sliding',
      burst_mode: this._isBurstWindowActive(now)
    };
  }
  
  /**
   * Clean up expired entries from tracking windows
   * 
   * @param {number} now - Current timestamp
   */
  _cleanupWindows(now) {
    const cutoff = now - this.windowMs;
    
    // Clean global window
    this.globalWindow = this.globalWindow.filter(ts => ts > cutoff);
    
    // Clean agent windows
    for (const [agentId, window] of this.agentWindows.entries()) {
      const filtered = window.filter(ts => ts > cutoff);
      if (filtered.length === 0) {
        this.agentWindows.delete(agentId);
      } else {
        this.agentWindows.set(agentId, filtered);
      }
    }
    
    // Clean objective windows
    for (const [objectiveId, window] of this.objectiveWindows.entries()) {
      const filtered = window.filter(ts => ts > cutoff);
      if (filtered.length === 0) {
        this.objectiveWindows.delete(objectiveId);
      } else {
        this.objectiveWindows.set(objectiveId, filtered);
      }
    }
  }
  
  /**
   * Reset all rate limit windows (for testing / emergency)
   */
  reset() {
    this.globalWindow = new SlidingWindow(this.policy);
    this.agentWindows.clear();
    this.tenantWindows.clear();
    this.objectiveWindows.clear();
  }

  /**
   * Get or create agent sliding window
   * 
   * @private
   */
  _getAgentWindow(agentId) {
    if (!this.agentWindows.has(agentId)) {
      this.agentWindows.set(agentId, new SlidingWindow(this.policy));
    }
    return this.agentWindows.get(agentId);
  }

  /**
   * Get or create tenant sliding window
   * 
   * @private
   */
  _getTenantWindow(tenantId) {
    if (!this.tenantWindows.has(tenantId)) {
      this.tenantWindows.set(tenantId, new SlidingWindow(this.policy));
    }
    return this.tenantWindows.get(tenantId);
  }

  /**
   * Get or create objective sliding window
   * 
   * @private
   */
  _getObjectiveWindow(objectiveId) {
    if (!this.objectiveWindows.has(objectiveId)) {
      this.objectiveWindows.set(objectiveId, new SlidingWindow(this.policy));
    }
    return this.objectiveWindows.get(objectiveId);
  }

  /**
   * Calculate effective limit considering burst allowance
   * 
   * @private
   */
  _getEffectiveLimit(baseLimit, now) {
    if (this._isBurstWindowActive(now)) {
      return this._getBurstCapacity(baseLimit, now);
    }
    return baseLimit;
  }

  /**
   * Check if we're currently in a burst window
   * 
   * @private
   */
  _isBurstWindowActive(now) {
    // Simple burst detection: allow burst if we haven't seen much activity recently
    const recentActivityThreshold = this.policy.window_size_ms * 0.5; // 50% of window
    const globalRecentCount = this.globalWindow.getRecentCount(now, recentActivityThreshold);
    
    // If recent activity is low, allow burst
    return globalRecentCount < (this.policy.max_envelopes_per_minute_global * 0.3);
  }

  /**
   * Calculate burst capacity for a limit
   * 
   * @private
   */
  _getBurstCapacity(baseLimit, now) {
    return Math.floor(baseLimit * this.policy.burst_allowance_ratio);
  }
}

module.exports = RateLimiter;
