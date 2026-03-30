export namespace ProposalType {
    let INVESTIGATE: string;
    let RESTORE: string;
    let RECONCILE: string;
    let ESCALATE: string;
    let NOTIFY: string;
    let QUARANTINE: string;
}
export namespace ProposalStatus {
    let PENDING: string;
    let APPROVED: string;
    let REJECTED: string;
    let MODIFIED: string;
    let EXPIRED: string;
    let EXECUTED: string;
}
export namespace RiskTier {
    let T0: string;
    let T1: string;
    let T2: string;
}
export namespace VALID_TRANSITIONS {
    let pending: string[];
    let modified: string[];
    let approved: string[];
    let rejected: any[];
    let expired: any[];
    let executed: any[];
}
/**
 * Validate status transition
 */
export function isValidTransition(currentStatus: any, newStatus: any): any;
/**
 * Validate proposal object
 */
export function validateProposal(proposal: any): boolean;
/**
 * Validate proposal creation input
 */
export function validateProposalCreate(input: any): boolean;
/**
 * Validate Proposal Update
 */
export function validateProposalUpdate(currentProposal: any, updates: any): any;
/**
 * Validate intent object
 */
export function validateIntentObject(intent: any): boolean;
/**
 * Validate risk assessment
 */
export function validateRiskAssessment(risk: any): boolean;
/**
 * Generate proposal ID
 */
export function generateProposalId(): string;
/**
 * Create Proposal Object
 */
export function createProposal(input: any): {
    proposal_type: any;
    objective_id: any;
    anomaly_id: any;
    suggested_intent: any;
    rationale: any;
    risk_assessment: any;
    confidence: any;
    metadata: any;
    proposal_id: string;
    created_at: string;
    expires_at: string;
    status: string;
};
/**
 * Check if proposal is expired
 */
export function isExpired(proposal: any): boolean;
/**
 * Check if proposal is terminal
 */
export function isTerminal(proposal: any): boolean;
/**
 * Check if proposal is pending review
 */
export function isPendingReview(proposal: any): boolean;
/**
 * Check if proposal can be approved
 */
export function canApprove(proposal: any): {
    allowed: boolean;
    reason: string;
} | {
    allowed: boolean;
    reason?: undefined;
};
/**
 * Get time remaining until expiry
 */
export function getTimeRemaining(proposal: any): number;
/**
 * Format proposal summary
 */
export function formatSummary(proposal: any): string;
/**
 * Build approval decision object
 */
export function buildApprovalDecision(approved: any, reviewed_by: any, options?: {}): {
    approved: any;
    reviewed_by: any;
    reviewed_at: string;
    modifications: any;
    reason: any;
};
//# sourceMappingURL=proposal-schema.d.ts.map