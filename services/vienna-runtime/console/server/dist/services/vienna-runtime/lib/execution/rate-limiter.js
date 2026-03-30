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
            max_envelopes_per_minute_per_objective: policy.max_envelopes_per_minute_per_objective || 15
        };
        // Tracking windows (1-minute sliding)
        this.agentWindows = new Map(); // agent_id → timestamps[]
        this.globalWindow = [];
        this.objectiveWindows = new Map(); // objective_id → timestamps[]
        // Window duration (1 minute)
        this.windowMs = 60 * 1000;
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
        const objectiveId = envelope.objective_id;
        // Clean old entries first
        this._cleanupWindows(now);
        // Check global limit
        if (this.globalWindow.length >= this.policy.max_envelopes_per_minute_global) {
            return {
                allowed: false,
                reason: `Global rate limit exceeded: ${this.globalWindow.length}/${this.policy.max_envelopes_per_minute_global} per minute`,
                scope: 'global',
                limit_type: 'GLOBAL_RATE_LIMIT'
            };
        }
        // Check per-agent limit
        const agentWindow = this.agentWindows.get(agentId) || [];
        if (agentWindow.length >= this.policy.max_envelopes_per_minute_per_agent) {
            return {
                allowed: false,
                reason: `Agent rate limit exceeded: ${agentWindow.length}/${this.policy.max_envelopes_per_minute_per_agent} per minute for agent ${agentId}`,
                scope: 'agent',
                agent_id: agentId,
                limit_type: 'AGENT_RATE_LIMIT'
            };
        }
        // Check per-objective limit
        if (objectiveId) {
            const objectiveWindow = this.objectiveWindows.get(objectiveId) || [];
            if (objectiveWindow.length >= this.policy.max_envelopes_per_minute_per_objective) {
                return {
                    allowed: false,
                    reason: `Objective rate limit exceeded: ${objectiveWindow.length}/${this.policy.max_envelopes_per_minute_per_objective} per minute for objective ${objectiveId}`,
                    scope: 'objective',
                    objective_id: objectiveId,
                    limit_type: 'OBJECTIVE_RATE_LIMIT'
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
        const objectiveId = envelope.objective_id;
        // Record in global window
        this.globalWindow.push(now);
        // Record in agent window
        if (!this.agentWindows.has(agentId)) {
            this.agentWindows.set(agentId, []);
        }
        this.agentWindows.get(agentId).push(now);
        // Record in objective window
        if (objectiveId) {
            if (!this.objectiveWindows.has(objectiveId)) {
                this.objectiveWindows.set(objectiveId, []);
            }
            this.objectiveWindows.get(objectiveId).push(now);
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
            agentStats[agentId] = {
                count: window.length,
                limit: this.policy.max_envelopes_per_minute_per_agent,
                remaining: Math.max(0, this.policy.max_envelopes_per_minute_per_agent - window.length)
            };
        }
        const objectiveStats = {};
        for (const [objectiveId, window] of this.objectiveWindows.entries()) {
            objectiveStats[objectiveId] = {
                count: window.length,
                limit: this.policy.max_envelopes_per_minute_per_objective,
                remaining: Math.max(0, this.policy.max_envelopes_per_minute_per_objective - window.length)
            };
        }
        return {
            global: {
                count: this.globalWindow.length,
                limit: this.policy.max_envelopes_per_minute_global,
                remaining: Math.max(0, this.policy.max_envelopes_per_minute_global - this.globalWindow.length)
            },
            agents: agentStats,
            objectives: objectiveStats,
            policy: { ...this.policy }
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
            }
            else {
                this.agentWindows.set(agentId, filtered);
            }
        }
        // Clean objective windows
        for (const [objectiveId, window] of this.objectiveWindows.entries()) {
            const filtered = window.filter(ts => ts > cutoff);
            if (filtered.length === 0) {
                this.objectiveWindows.delete(objectiveId);
            }
            else {
                this.objectiveWindows.set(objectiveId, filtered);
            }
        }
    }
    /**
     * Reset all rate limit windows (for testing / emergency)
     */
    reset() {
        this.globalWindow = [];
        this.agentWindows.clear();
        this.objectiveWindows.clear();
    }
}
module.exports = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map