/**
 * Phase 9.7.3 — Action Result Definition
 *
 * Standard result format for all action executions.
 */
/**
 * @typedef {Object} ActionResult
 * @property {boolean} ok - Whether action succeeded
 * @property {string} actionType - Action type executed
 * @property {string} [target] - Target entity (service, endpoint, etc.)
 * @property {string} startedAt - ISO timestamp when action started
 * @property {string} finishedAt - ISO timestamp when action finished
 * @property {string} [stdout] - Standard output (if applicable)
 * @property {string} [stderr] - Standard error (if applicable)
 * @property {number} [exitCode] - Exit code (if applicable)
 * @property {string} [error] - Error message (if failed)
 * @property {Record<string, unknown>} [details] - Additional structured details
 */
/**
 * Create a success result
 * @param {string} actionType
 * @param {string} startedAt
 * @param {Partial<ActionResult>} [extras={}]
 * @returns {ActionResult}
 */
function createSuccessResult(actionType, startedAt, extras = {}) {
    return {
        ok: true,
        actionType,
        startedAt,
        finishedAt: new Date().toISOString(),
        ...extras
    };
}
/**
 * Create a failure result
 * @param {string} actionType
 * @param {string} startedAt
 * @param {string} error
 * @param {Partial<ActionResult>} [extras={}]
 * @returns {ActionResult}
 */
function createFailureResult(actionType, startedAt, error, extras = {}) {
    return {
        ok: false,
        actionType,
        startedAt,
        finishedAt: new Date().toISOString(),
        error,
        ...extras
    };
}
module.exports = {
    createSuccessResult,
    createFailureResult
};
//# sourceMappingURL=action-result.js.map