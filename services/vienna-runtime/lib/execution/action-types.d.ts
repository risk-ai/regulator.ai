export type SystemServiceRestartAction = {
    type: "system_service_restart";
    /**
     * - Service name (must be in allowlist)
     */
    target: string;
    /**
     * - Execution timeout
     */
    timeoutMs?: number;
};
export type SleepAction = {
    type: "sleep";
    /**
     * - Sleep duration in milliseconds
     */
    durationMs: number;
};
export type HealthCheckAction = {
    type: "health_check";
    /**
     * - Service name to check
     */
    target: string;
    /**
     * - Check timeout
     */
    timeoutMs?: number;
};
export type ActionDescriptor = SystemServiceRestartAction | SleepAction | HealthCheckAction;
/**
 * Phase 9.7.3 — Action Type Definitions
 *
 * Typed action descriptors for ChatActionBridge execution.
 * These are the ONLY allowed action types.
 *
 * Design constraint: No generic shell commands, no dynamic plans.
 */
/**
 * @typedef {Object} SystemServiceRestartAction
 * @property {'system_service_restart'} type
 * @property {string} target - Service name (must be in allowlist)
 * @property {number} [timeoutMs=30000] - Execution timeout
 */
/**
 * @typedef {Object} SleepAction
 * @property {'sleep'} type
 * @property {number} durationMs - Sleep duration in milliseconds
 */
/**
 * @typedef {Object} HealthCheckAction
 * @property {'health_check'} type
 * @property {string} target - Service name to check
 * @property {number} [timeoutMs=10000] - Check timeout
 */
/**
 * @typedef {SystemServiceRestartAction | SleepAction | HealthCheckAction} ActionDescriptor
 */
/**
 * Validate action descriptor structure
 * @param {ActionDescriptor} action
 * @returns {boolean}
 */
export function isValidActionDescriptor(action: ActionDescriptor): boolean;
//# sourceMappingURL=action-types.d.ts.map