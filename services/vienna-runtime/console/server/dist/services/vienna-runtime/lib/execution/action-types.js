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
function isValidActionDescriptor(action) {
    if (!action || typeof action !== 'object')
        return false;
    const validTypes = ['system_service_restart', 'sleep', 'health_check'];
    if (!validTypes.includes(action.type))
        return false;
    switch (action.type) {
        case 'system_service_restart':
            return typeof action.target === 'string' && action.target.length > 0;
        case 'sleep':
            return typeof action.durationMs === 'number' && action.durationMs >= 0;
        case 'health_check':
            return typeof action.target === 'string' && action.target.length > 0;
        default:
            return false;
    }
}
module.exports = {
    isValidActionDescriptor
};
//# sourceMappingURL=action-types.js.map