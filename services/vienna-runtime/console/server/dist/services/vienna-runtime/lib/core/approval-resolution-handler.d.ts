export namespace ResolutionOutcome {
    let APPROVED: string;
    let DENIED: string;
    let EXPIRED: string;
    let MISSING: string;
    let MALFORMED: string;
}
/**
 * Resolve approval status and determine execution path
 *
 * @param {Object} approval - Approval object
 * @param {Object} step - Plan step
 * @param {Object} context - Execution context
 * @returns {Object} Resolution result
 */
export function resolveApprovalStatus(approval: any, step: any, context: any): any;
/**
 * Validate approval before resumption
 *
 * Secondary validation before continuing to warrant/execution.
 * Protects against race conditions and state corruption.
 *
 * @param {Object} approval - Approval object
 * @param {Object} step - Plan step
 * @param {Object} context - Execution context
 * @returns {Object} Validation result
 */
export function validateApprovalForResumption(approval: any, step: any, context: any): any;
/**
 * Determine ledger event type from resolution outcome
 *
 * @param {string} outcome - ResolutionOutcome
 * @returns {string} Ledger event type
 */
export function getLedgerEventType(outcome: string): string;
//# sourceMappingURL=approval-resolution-handler.d.ts.map