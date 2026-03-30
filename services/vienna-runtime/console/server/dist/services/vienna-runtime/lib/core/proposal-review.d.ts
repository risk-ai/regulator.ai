export = ProposalReviewer;
declare class ProposalReviewer {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Approve proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {object} modifications - Optional intent modifications
     * @returns {Promise<object>} - Approval result
     */
    approve(proposal_id: string, reviewed_by: string, modifications?: object): Promise<object>;
    /**
     * Reject proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {string} reason - Rejection reason
     * @returns {Promise<object>} - Rejection result
     */
    reject(proposal_id: string, reviewed_by: string, reason: string): Promise<object>;
    /**
     * Modify proposal
     *
     * @param {string} proposal_id - Proposal identifier
     * @param {string} reviewed_by - Operator identifier
     * @param {object} modifications - Intent modifications
     * @returns {Promise<object>} - Modification result
     */
    modify(proposal_id: string, reviewed_by: string, modifications: object): Promise<object>;
    /**
     * Expire stale proposals
     *
     * @returns {Promise<Array>} - Array of expired proposal IDs
     */
    expireStaleProposals(): Promise<any[]>;
}
//# sourceMappingURL=proposal-review.d.ts.map