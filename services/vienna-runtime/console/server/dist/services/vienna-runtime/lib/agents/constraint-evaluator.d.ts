export = ConstraintEvaluator;
declare class ConstraintEvaluator {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Evaluate agent proposal constraints
     *
     * @param {object} agentProposal - Agent proposal object
     * @param {object} agent - Agent object
     * @returns {object} - {allowed: boolean, violations: Array}
     */
    evaluate(agentProposal: object, agent: object): object;
    /**
     * Get recent proposal count (stub)
     *
     * @param {string} agent_id - Agent identifier
     * @returns {Promise<number>} - Count of recent proposals
     */
    getRecentProposalCount(agent_id: string): Promise<number>;
    /**
     * Check safe mode
     *
     * If safe mode active, restrict to investigate-only actions.
     *
     * @param {object} plan - Plan object
     * @returns {object} - {allowed: boolean, reason: string}
     */
    checkSafeMode(plan: object): object;
}
//# sourceMappingURL=constraint-evaluator.d.ts.map