export = RateLimiter;
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
declare class RateLimiter {
    constructor(policy?: {});
    policy: {
        max_envelopes_per_minute_per_agent: any;
        max_envelopes_per_minute_global: any;
        max_envelopes_per_minute_per_objective: any;
    };
    agentWindows: Map<any, any>;
    globalWindow: any[];
    objectiveWindows: Map<any, any>;
    windowMs: number;
    /**
     * Check if envelope can be admitted
     *
     * @param {object} envelope - Envelope to check
     * @returns {object} { allowed: boolean, reason?: string, scope?: string }
     */
    checkAdmission(envelope: object): object;
    /**
     * Record admission (call after envelope accepted)
     *
     * @param {object} envelope - Envelope that was admitted
     */
    recordAdmission(envelope: object): void;
    /**
     * Get current rate limit state
     *
     * @returns {object} Current window state
     */
    getState(): object;
    /**
     * Clean up expired entries from tracking windows
     *
     * @param {number} now - Current timestamp
     */
    _cleanupWindows(now: number): void;
    /**
     * Reset all rate limit windows (for testing / emergency)
     */
    reset(): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map