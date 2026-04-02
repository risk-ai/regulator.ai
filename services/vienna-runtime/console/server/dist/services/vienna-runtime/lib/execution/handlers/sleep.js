/**
 * Phase 9.7.3 — Sleep Handler
 *
 * Delay execution for a specified duration.
 * Used in remediation plans for stability windows.
 */
const { createSuccessResult } = require('../action-result');
/**
 * Sleep for specified duration
 * @param {import('../action-types').SleepAction} action
 * @returns {Promise<import('../action-result').ActionResult>}
 */
async function sleep(action) {
    const startedAt = new Date().toISOString();
    const durationMs = action.durationMs;
    await new Promise(resolve => setTimeout(resolve, durationMs));
    return createSuccessResult(action.type, startedAt, {
        details: { durationMs }
    });
}
module.exports = { sleep };
//# sourceMappingURL=sleep.js.map