/**
 * Proposal Review — Phase 15 Stage 5
 *
 * Operator review flow for proposed intents.
 * Approved proposals enter governance pipeline.
 */
const { buildApprovalDecision } = require('./proposal-schema.js');
class ProposalReviewer {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
    }
    /**
     * Approve proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {object} modifications - Optional intent modifications
     * @returns {Promise<object>} - Approval result
     */
    async approve(proposal_id, reviewed_by, modifications = null) {
        const proposal = this.stateGraph.getProposal(proposal_id);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== 'pending' && proposal.status !== 'modified') {
            throw new Error(`Cannot approve ${proposal.status} proposal`);
        }
        // Check expiry
        if (new Date() > new Date(proposal.expires_at)) {
            this.stateGraph.expireProposal(proposal_id);
            throw new Error('Proposal has expired');
        }
        // Build decision
        const decision = buildApprovalDecision(true, reviewed_by, { modifications });
        // Review proposal
        const reviewed = this.stateGraph.reviewProposal(proposal_id, decision);
        // If approved, create plan from intent
        const intent = modifications
            ? { ...proposal.suggested_intent, ...modifications }
            : proposal.suggested_intent;
        // Generate plan (Phase 8.1)
        const planGenerator = require('./plan-generator.js');
        const plan = await planGenerator.generatePlan(intent);
        // Policy evaluation (Phase 8.4)
        const policyEngine = require('./constraint-evaluator.js');
        const policyDecision = await policyEngine.evaluateForPlan(plan);
        if (!policyDecision.allowed) {
            // Policy blocked even after approval
            this.stateGraph.recordProposalEvent(proposal_id, 'policy_blocked', {
                policy_id: policyDecision.policy_id,
                reason: policyDecision.reason
            });
            return {
                admitted: false,
                reason: policyDecision.reason,
                policy_blocked: true,
                proposal_id,
                plan_id: plan.plan_id
            };
        }
        // Link plan to proposal
        this.stateGraph.updateProposal(proposal_id, { plan_id: plan.plan_id });
        // Record admission to governance
        this.stateGraph.recordProposalEvent(proposal_id, 'admitted_to_governance', {
            plan_id: plan.plan_id
        });
        console.log(`[ProposalReview] Approved proposal ${proposal_id}, created plan ${plan.plan_id}`);
        return {
            admitted: true,
            proposal_id,
            plan_id: plan.plan_id,
            reviewed_by
        };
    }
    /**
     * Reject proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {string} reason - Rejection reason
     * @returns {Promise<object>} - Rejection result
     */
    async reject(proposal_id, reviewed_by, reason) {
        const proposal = this.stateGraph.getProposal(proposal_id);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== 'pending' && proposal.status !== 'modified') {
            throw new Error(`Cannot reject ${proposal.status} proposal`);
        }
        // Build decision
        const decision = buildApprovalDecision(false, reviewed_by, { reason });
        // Review proposal
        this.stateGraph.reviewProposal(proposal_id, decision);
        console.log(`[ProposalReview] Rejected proposal ${proposal_id}: ${reason}`);
        return {
            rejected: true,
            proposal_id,
            reviewed_by,
            reason
        };
    }
    /**
     * Modify proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {object} modifications - Intent modifications
     * @returns {Promise<object>} - Modification result
     */
    async modify(proposal_id, reviewed_by, modifications) {
        const proposal = this.stateGraph.getProposal(proposal_id);
        if (!proposal) {
            throw new Error('Proposal not found');
        }
        if (proposal.status !== 'pending') {
            throw new Error(`Cannot modify ${proposal.status} proposal`);
        }
        // Update status to modified
        this.stateGraph.updateProposal(proposal_id, {
            status: 'modified',
            reviewed_by,
            reviewed_at: new Date().toISOString(),
            approval_decision: buildApprovalDecision(null, reviewed_by, { modifications })
        });
        this.stateGraph.recordProposalEvent(proposal_id, 'modified', { modifications });
        console.log(`[ProposalReview] Modified proposal ${proposal_id}`);
        return {
            modified: true,
            proposal_id,
            reviewed_by,
            modifications
        };
    }
    /**
     * Expire stale proposals
     *
     * @returns {Promise<Array>} - Array of expired proposal IDs
     */
    async expireStaleProposals() {
        const stale = this.stateGraph.listProposals({
            expired: true,
            limit: 100
        });
        const expired = [];
        for (const proposal of stale) {
            if (proposal.status === 'pending' || proposal.status === 'modified') {
                this.stateGraph.expireProposal(proposal.proposal_id);
                expired.push(proposal.proposal_id);
            }
        }
        if (expired.length > 0) {
            console.log(`[ProposalReview] Expired ${expired.length} stale proposals`);
        }
        return expired;
    }
}
module.exports = ProposalReviewer;
//# sourceMappingURL=proposal-review.js.map