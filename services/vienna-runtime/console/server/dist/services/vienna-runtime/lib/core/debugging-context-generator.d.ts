export namespace ExplanationType {
    let BLOCKED: string;
    let DENIED: string;
    let RETRIED: string;
    let APPROVED: string;
    let SKIPPED: string;
    let POLICY_APPLIED: string;
    let VERIFICATION_FAILED: string;
}
/**
 * Generate "why blocked?" explanation
 *
 * @param {object} blockEvent - Block event from ledger
 * @returns {object} Explanation object
 */
export function explainBlocked(blockEvent: object): object;
/**
 * Generate "why denied?" explanation
 *
 * @param {object} denyEvent - Denial event from ledger
 * @returns {object} Explanation object
 */
export function explainDenied(denyEvent: object): object;
/**
 * Generate "why retried?" explanation
 *
 * @param {object} retryHistory - Retry history from verification result
 * @returns {object} Explanation object
 */
export function explainRetried(retryHistory: object): object;
/**
 * Generate policy explanation
 *
 * @param {object} policyDecision - Policy decision from ledger
 * @returns {object} Explanation object
 */
export function explainPolicyDecision(policyDecision: object): object;
/**
 * Generate verification failure explanation
 *
 * @param {object} verificationResult - Verification result
 * @returns {object} Explanation object
 */
export function explainVerificationFailure(verificationResult: object): object;
/**
 * Generate comprehensive execution trace explanation
 *
 * Combines all available context into single operator-facing explanation.
 *
 * @param {object} execution - Execution object from ledger
 * @returns {object} Comprehensive explanation
 */
export function explainExecution(execution: object): object;
/**
 * Build chronological execution timeline
 */
export function buildExecutionTimeline(execution: any): {
    timestamp: any;
    stage: string;
    description: string;
    type: string;
}[];
/**
 * Generate high-level operator summary
 */
export function generateOperatorSummary(explanations: any): string;
//# sourceMappingURL=debugging-context-generator.d.ts.map