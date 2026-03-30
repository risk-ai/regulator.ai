/**
 * Proposal Schema — Phase 15
 *
 * Entity representing suggested intents awaiting operator review.
 *
 * Core Invariant: Proposals cannot execute directly.
 * All proposals must pass through operator review + governance pipeline.
 */
/**
 * Proposal Types
 */
const ProposalType = {
    INVESTIGATE: 'investigate',
    RESTORE: 'restore',
    RECONCILE: 'reconcile',
    ESCALATE: 'escalate',
    NOTIFY: 'notify',
    QUARANTINE: 'quarantine'
};
/**
 * Proposal Status
 */
const ProposalStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    MODIFIED: 'modified',
    EXPIRED: 'expired',
    EXECUTED: 'executed'
};
/**
 * Risk Tier
 */
const RiskTier = {
    T0: 'T0',
    T1: 'T1',
    T2: 'T2'
};
/**
 * Valid Status Transitions
 */
const VALID_TRANSITIONS = {
    pending: ['approved', 'rejected', 'modified', 'expired'],
    modified: ['approved', 'rejected', 'expired'],
    approved: ['executed'],
    rejected: [],
    expired: [],
    executed: []
};
/**
 * Validate proposal type
 */
function isValidProposalType(type) {
    return Object.values(ProposalType).includes(type);
}
/**
 * Validate status
 */
function isValidStatus(status) {
    return Object.values(ProposalStatus).includes(status);
}
/**
 * Validate risk tier
 */
function isValidRiskTier(tier) {
    return Object.values(RiskTier).includes(tier);
}
/**
 * Validate intent object
 */
function validateIntentObject(intent) {
    const errors = [];
    if (intent.intent_type !== 'proposed') {
        errors.push('intent_type must be "proposed"');
    }
    if (!intent.action || typeof intent.action !== 'string') {
        errors.push('action is required and must be a string');
    }
    if (!isValidRiskTier(intent.risk_tier)) {
        errors.push(`risk_tier must be one of: ${Object.values(RiskTier).join(', ')}`);
    }
    if (errors.length > 0) {
        throw new Error(`Intent object validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate risk assessment
 */
function validateRiskAssessment(risk) {
    const errors = [];
    if (!isValidRiskTier(risk.risk_tier)) {
        errors.push(`risk_tier must be one of: ${Object.values(RiskTier).join(', ')}`);
    }
    const validImpacts = ['none', 'low', 'medium', 'high'];
    if (!risk.impact || !validImpacts.includes(risk.impact)) {
        errors.push(`impact must be one of: ${validImpacts.join(', ')}`);
    }
    const validReversibility = ['safe', 'reversible', 'partially_reversible', 'irreversible'];
    if (!risk.reversibility || !validReversibility.includes(risk.reversibility)) {
        errors.push(`reversibility must be one of: ${validReversibility.join(', ')}`);
    }
    if (errors.length > 0) {
        throw new Error(`Risk assessment validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate proposal object
 */
function validateProposal(proposal) {
    const errors = [];
    // Required fields
    if (!proposal.proposal_id || typeof proposal.proposal_id !== 'string') {
        errors.push('proposal_id is required and must be a string');
    }
    else if (!/^prop_\d+_[a-z0-9]+$/.test(proposal.proposal_id)) {
        errors.push('proposal_id must match pattern: prop_<timestamp>_<random>');
    }
    if (!isValidProposalType(proposal.proposal_type)) {
        errors.push(`proposal_type must be one of: ${Object.values(ProposalType).join(', ')}`);
    }
    if (!proposal.suggested_intent) {
        errors.push('suggested_intent is required');
    }
    else {
        try {
            validateIntentObject(proposal.suggested_intent);
        }
        catch (e) {
            errors.push(`suggested_intent: ${e.message}`);
        }
    }
    if (!proposal.rationale || typeof proposal.rationale !== 'string') {
        errors.push('rationale is required and must be non-empty string');
    }
    if (!proposal.risk_assessment) {
        errors.push('risk_assessment is required');
    }
    else {
        try {
            validateRiskAssessment(proposal.risk_assessment);
        }
        catch (e) {
            errors.push(`risk_assessment: ${e.message}`);
        }
    }
    if (typeof proposal.confidence !== 'number' || proposal.confidence < 0 || proposal.confidence > 1) {
        errors.push('confidence must be a number between 0.0 and 1.0');
    }
    if (!proposal.created_at || typeof proposal.created_at !== 'string') {
        errors.push('created_at is required and must be ISO 8601 datetime');
    }
    if (!proposal.expires_at || typeof proposal.expires_at !== 'string') {
        errors.push('expires_at is required and must be ISO 8601 datetime');
    }
    else if (new Date(proposal.expires_at) <= new Date(proposal.created_at)) {
        errors.push('expires_at must be after created_at');
    }
    if (!isValidStatus(proposal.status)) {
        errors.push(`status must be one of: ${Object.values(ProposalStatus).join(', ')}`);
    }
    const reviewedStatuses = ['approved', 'rejected', 'modified'];
    if (reviewedStatuses.includes(proposal.status) && (!proposal.reviewed_by || !proposal.reviewed_at)) {
        errors.push('reviewed_by and reviewed_at required for reviewed statuses');
    }
    if ((proposal.status === 'approved' || proposal.status === 'rejected') && !proposal.approval_decision) {
        errors.push('approval_decision required for approved/rejected status');
    }
    if (errors.length > 0) {
        throw new Error(`Proposal validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate proposal creation input
 */
function validateProposalCreate(input) {
    const errors = [];
    if (!isValidProposalType(input.proposal_type)) {
        errors.push(`proposal_type must be one of: ${Object.values(ProposalType).join(', ')}`);
    }
    if (!input.suggested_intent) {
        errors.push('suggested_intent is required');
    }
    else {
        try {
            validateIntentObject(input.suggested_intent);
        }
        catch (e) {
            errors.push(`suggested_intent: ${e.message}`);
        }
    }
    if (!input.rationale || typeof input.rationale !== 'string') {
        errors.push('rationale is required and must be non-empty string');
    }
    if (!input.risk_assessment) {
        errors.push('risk_assessment is required');
    }
    else {
        try {
            validateRiskAssessment(input.risk_assessment);
        }
        catch (e) {
            errors.push(`risk_assessment: ${e.message}`);
        }
    }
    if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) {
        errors.push('confidence must be a number between 0.0 and 1.0');
    }
    if (errors.length > 0) {
        throw new Error(`Proposal creation validation failed:\n${errors.join('\n')}`);
    }
    return true;
}
/**
 * Validate status transition
 */
function isValidTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus)
        return true;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    return allowedTransitions && allowedTransitions.includes(newStatus);
}
/**
 * Generate proposal ID
 */
function generateProposalId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `prop_${timestamp}_${random}`;
}
/**
 * Create Proposal Object
 */
function createProposal(input) {
    validateProposalCreate(input);
    const created_at = new Date();
    const expires_in_seconds = input.expires_in_seconds || 3600;
    const expires_at = new Date(created_at.getTime() + (expires_in_seconds * 1000));
    const proposal = {
        proposal_type: input.proposal_type,
        objective_id: input.objective_id || null,
        anomaly_id: input.anomaly_id || null,
        suggested_intent: input.suggested_intent,
        rationale: input.rationale,
        risk_assessment: input.risk_assessment,
        confidence: input.confidence,
        metadata: input.metadata || {},
        proposal_id: generateProposalId(),
        created_at: created_at.toISOString(),
        expires_at: expires_at.toISOString(),
        status: 'pending'
    };
    validateProposal(proposal);
    return proposal;
}
/**
 * Validate Proposal Update
 */
function validateProposalUpdate(currentProposal, updates) {
    const errors = [];
    if (updates.status) {
        if (!isValidStatus(updates.status)) {
            errors.push(`status must be one of: ${Object.values(ProposalStatus).join(', ')}`);
        }
        else if (!isValidTransition(currentProposal.status, updates.status)) {
            errors.push(`Invalid status transition: ${currentProposal.status} → ${updates.status}. ` +
                `Allowed: ${VALID_TRANSITIONS[currentProposal.status].join(', ')}`);
        }
    }
    if (errors.length > 0) {
        throw new Error(`Proposal update validation failed:\n${errors.join('\n')}`);
    }
    // Add reviewed_at if not provided
    const reviewedStatuses = ['approved', 'rejected', 'modified'];
    if (updates.status && reviewedStatuses.includes(updates.status) && !updates.reviewed_at) {
        updates.reviewed_at = new Date().toISOString();
    }
    return updates;
}
/**
 * Check if proposal is expired
 */
function isExpired(proposal) {
    if (proposal.status === 'expired')
        return true;
    return new Date() > new Date(proposal.expires_at);
}
/**
 * Check if proposal is terminal
 */
function isTerminal(proposal) {
    const terminalStatuses = ['rejected', 'expired', 'executed'];
    return terminalStatuses.includes(proposal.status);
}
/**
 * Check if proposal is pending review
 */
function isPendingReview(proposal) {
    return proposal.status === 'pending' || proposal.status === 'modified';
}
/**
 * Check if proposal can be approved
 */
function canApprove(proposal) {
    if (proposal.status !== 'pending' && proposal.status !== 'modified') {
        return { allowed: false, reason: `Cannot approve ${proposal.status} proposal` };
    }
    if (isExpired(proposal)) {
        return { allowed: false, reason: 'Proposal has expired' };
    }
    return { allowed: true };
}
/**
 * Get time remaining until expiry
 */
function getTimeRemaining(proposal) {
    const now = new Date();
    const expiry = new Date(proposal.expires_at);
    const remaining = Math.floor((expiry - now) / 1000);
    return Math.max(0, remaining);
}
/**
 * Format proposal summary
 */
function formatSummary(proposal) {
    const parts = [
        `[${proposal.risk_assessment.risk_tier}]`,
        proposal.proposal_type,
        `for ${proposal.suggested_intent.action}`
    ];
    if (proposal.suggested_intent.target_id) {
        parts.push(`on ${proposal.suggested_intent.target_id}`);
    }
    const remaining = getTimeRemaining(proposal);
    if (remaining > 0) {
        const minutes = Math.floor(remaining / 60);
        parts.push(`(expires in ${minutes}m)`);
    }
    else {
        parts.push('(EXPIRED)');
    }
    return parts.join(' ');
}
/**
 * Build approval decision object
 */
function buildApprovalDecision(approved, reviewed_by, options = {}) {
    return {
        approved,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        modifications: options.modifications || null,
        reason: options.reason || null
    };
}
module.exports = {
    // Enums
    ProposalType,
    ProposalStatus,
    RiskTier,
    // State machine
    VALID_TRANSITIONS,
    isValidTransition,
    // Validation
    validateProposal,
    validateProposalCreate,
    validateProposalUpdate,
    validateIntentObject,
    validateRiskAssessment,
    // Helpers
    generateProposalId,
    createProposal,
    isExpired,
    isTerminal,
    isPendingReview,
    canApprove,
    getTimeRemaining,
    formatSummary,
    buildApprovalDecision
};
//# sourceMappingURL=proposal-schema.js.map