export class RecursionGuard {
    constructor(options?: {});
    policy: any;
    scopeOverrides: any;
    triggerBudgets: Map<any, any>;
    idempotencyCache: Map<any, any>;
    cooldownTracker: Map<any, any>;
    targetFingerprints: Map<any, any>;
    /**
     * Validate envelope against recursion policy
     *
     * @param {object} envelope - Envelope to validate
     * @returns {object} { allowed: boolean, reason?: string, blocked_by?: string }
     */
    validate(envelope: object): object;
    /**
     * Record envelope execution for tracking
     *
     * Called after successful execution to update budgets and caches.
     *
     * @param {object} envelope - Executed envelope
     */
    recordExecution(envelope: object): void;
    /**
     * Cleanup expired cache entries
     *
     * Should be called periodically to prevent unbounded memory growth.
     */
    cleanup(): void;
    /**
     * Get current state (for observability)
     */
    getState(): {
        trigger_budgets: any;
        active_cooldowns: {
            target: any;
            envelope_id: any;
            age_seconds: number;
        }[];
        cached_idempotency_keys: number;
    };
    /**
     * Reset recursion tracking for an envelope (operator override)
     *
     * Used when operator explicitly requeues a failed envelope from DLQ.
     *
     * @param {string} envelopeId - Envelope ID to reset
     */
    reset(envelopeId: string): void;
    /**
     * Detect scope from envelope
     */
    _detectScope(envelope: any): "trading_config" | "trading_execution" | "system_config" | "default";
    /**
     * Get effective policy for scope
     */
    _getEffectivePolicy(scope: any): any;
    /**
     * Check idempotency (duplicate detection)
     */
    _checkIdempotency(idempotencyKey: any, windowSeconds: any): {
        allowed: boolean;
        original_envelope_id?: undefined;
        age_seconds?: undefined;
    } | {
        allowed: boolean;
        original_envelope_id: any;
        age_seconds: number;
    };
    /**
     * Check cooldown windows
     */
    _checkCooldown(envelope: any, cooldownSeconds: any): {
        allowed: boolean;
        reason: string;
        prior_envelope: any;
    } | {
        allowed: boolean;
        reason?: undefined;
        prior_envelope?: undefined;
    };
    /**
     * Detect material state change
     *
     * Material change = target fingerprint changed since prior execution.
     */
    _detectMaterialChange(target: any, proposedFingerprint: any): boolean;
    /**
     * Compute target fingerprint
     *
     * Deterministic hash of target + relevant action state.
     */
    _computeTargetFingerprint(target: any, action: any): string;
    /**
     * Check if action type is mutating
     */
    _isMutatingAction(actionType: any): boolean;
}
export class RecursionBlockedError extends Error {
    constructor(reason: any, blockedBy: any, scope: any);
    blocked_by: any;
    scope: any;
}
export namespace DEFAULT_POLICY {
    let max_causal_depth: number;
    let max_descendants_per_root: number;
    let max_retries_per_envelope: number;
    let duplicate_window_seconds: number;
    let cooldown_seconds: number;
}
export namespace SCOPE_OVERRIDES {
    namespace trading_config {
        let max_descendants_per_root_1: number;
        export { max_descendants_per_root_1 as max_descendants_per_root };
        let cooldown_seconds_1: number;
        export { cooldown_seconds_1 as cooldown_seconds };
    }
    namespace trading_execution {
        let max_descendants_per_root_2: number;
        export { max_descendants_per_root_2 as max_descendants_per_root };
        let cooldown_seconds_2: number;
        export { cooldown_seconds_2 as cooldown_seconds };
    }
    namespace system_config {
        let max_descendants_per_root_3: number;
        export { max_descendants_per_root_3 as max_descendants_per_root };
        let cooldown_seconds_3: number;
        export { cooldown_seconds_3 as cooldown_seconds };
    }
}
//# sourceMappingURL=recursion-guard.d.ts.map