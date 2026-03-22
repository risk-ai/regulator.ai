export namespace CooldownMode {
    let EXPONENTIAL: string;
    let FIXED: string;
    let LINEAR: string;
}
export namespace KillStrategy {
    let COOPERATIVE_THEN_FORCED: string;
    let FORCED: string;
}
/**
 * Validate failure policy structure
 */
export function validateFailurePolicy(policy: any): {
    valid: boolean;
    errors: string[];
};
/**
 * Create default failure policy
 */
export function createDefaultPolicy(): {
    policy_id: string;
    policy_name: string;
    description: string;
    max_consecutive_failures: number;
    cooldown: {
        mode: string;
        base_seconds: number;
        multiplier: number;
        max_seconds: number;
    };
    degraded: {
        enter_after_consecutive_failures: number;
    };
    reset: {
        on_verified_recovery: boolean;
        on_manual_reset: boolean;
    };
    execution: {
        timeout_seconds: number;
        kill_strategy: string;
        grace_period_seconds: number;
    };
    created_at: string;
    updated_at: string;
};
/**
 * Calculate cooldown duration based on policy and failure count
 */
export function calculateCooldownDuration(policy: any, consecutiveFailures: any): number;
/**
 * Check if degraded threshold reached
 */
export function shouldEnterDegraded(policy: any, consecutiveFailures: any): boolean;
/**
 * Check if reset should occur
 */
export function shouldResetOnRecovery(policy: any): boolean;
export function shouldResetOnManualReset(policy: any): boolean;
//# sourceMappingURL=failure-policy-schema.d.ts.map