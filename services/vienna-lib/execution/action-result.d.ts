export type ActionResult = {
    /**
     * - Whether action succeeded
     */
    ok: boolean;
    /**
     * - Action type executed
     */
    actionType: string;
    /**
     * - Target entity (service, endpoint, etc.)
     */
    target?: string;
    /**
     * - ISO timestamp when action started
     */
    startedAt: string;
    /**
     * - ISO timestamp when action finished
     */
    finishedAt: string;
    /**
     * - Standard output (if applicable)
     */
    stdout?: string;
    /**
     * - Standard error (if applicable)
     */
    stderr?: string;
    /**
     * - Exit code (if applicable)
     */
    exitCode?: number;
    /**
     * - Error message (if failed)
     */
    error?: string;
    /**
     * - Additional structured details
     */
    details?: Record<string, unknown>;
};
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
export function createSuccessResult(actionType: string, startedAt: string, extras?: Partial<ActionResult>): ActionResult;
/**
 * Create a failure result
 * @param {string} actionType
 * @param {string} startedAt
 * @param {string} error
 * @param {Partial<ActionResult>} [extras={}]
 * @returns {ActionResult}
 */
export function createFailureResult(actionType: string, startedAt: string, error: string, extras?: Partial<ActionResult>): ActionResult;
//# sourceMappingURL=action-result.d.ts.map