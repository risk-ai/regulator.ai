export = PlanTranslator;
declare class PlanTranslator {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Translate agent plan to Phase 15 proposal
     *
     * Strategy: Multi-step plan → single proposal with composite intent
     *
     * @param {object} agentProposal - Agent proposal object
     * @param {string} strategy - Translation strategy ('composite' or 'multiple')
     * @returns {Promise<object>} - Phase 15 proposal (persisted)
     */
    translate(agentProposal: object, strategy?: string): Promise<object>;
    /**
     * Infer proposal type from plan
     *
     * @param {object} plan - Plan object
     * @returns {string} - Proposal type
     */
    inferProposalType(plan: object): string;
    /**
     * Alternative: Translate to multiple proposals (one per step)
     *
     * @param {object} agentProposal - Agent proposal object
     * @returns {Array} - Array of Phase 15 proposals
     */
    translateToMultiple(agentProposal: object): any[];
    /**
     * Infer proposal type from single step
     *
     * @param {object} step - Plan step
     * @returns {string} - Proposal type
     */
    inferProposalTypeFromStep(step: object): string;
}
//# sourceMappingURL=plan-translator.d.ts.map