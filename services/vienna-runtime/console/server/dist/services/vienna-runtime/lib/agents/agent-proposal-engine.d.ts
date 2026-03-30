export = AgentProposalEngine;
declare class AgentProposalEngine {
    constructor(stateGraph: any, agentRegistry: any);
    stateGraph: any;
    agentRegistry: any;
    /**
     * Generate plan from objective
     *
     * Implements intelligent plan generation based on:
     * - Objective type and current state
     * - Agent capabilities
     * - Historical success patterns
     * - Risk assessment
     *
     * @param {string} agent_id - Agent identifier
     * @param {object} objective - Objective object
     * @param {object} context - Additional context
     * @returns {Promise<object>} - Agent proposal
     */
    generatePlan(agent_id: string, objective: object, context?: object): Promise<object>;
    /**
     * Select strategy based on objective type and context
     *
     * @param {object} objective - Objective object
     * @param {object} agent - Agent object
     * @param {object} context - Additional context
     * @returns {Promise<object>} - Strategy object
     */
    selectStrategy(objective: object, agent: object, context: object): Promise<object>;
    /**
     * Build steps for strategy
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {object} agent - Agent object
     * @param {object} context - Additional context
     * @returns {Promise<Array>} - Plan steps
     */
    buildStepsForStrategy(strategy: object, objective: object, agent: object, context: object): Promise<any[]>;
    /**
     * Create individual step
     *
     * @param {string} stepType - Step type (investigate, reconcile, verify, etc.)
     * @param {object} objective - Objective object
     * @param {number} index - Step index
     * @param {Array} previousSteps - Previous steps (for dependencies)
     * @returns {object} - Step object
     */
    createStep(stepType: string, objective: object, index: number, previousSteps: any[]): object;
    /**
     * Assess plan risk
     *
     * @param {Array} steps - Plan steps
     * @param {object} objective - Objective object
     * @returns {object} - Risk assessment
     */
    assessPlanRisk(steps: any[], objective: object): object;
    /**
     * Generate reasoning for plan
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {Array} steps - Plan steps
     * @param {object} riskAssessment - Risk assessment
     * @returns {string} - Reasoning
     */
    generateReasoning(strategy: object, objective: object, steps: any[], riskAssessment: object): string;
    /**
     * Derive expected outcomes
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {Array} steps - Plan steps
     * @returns {Array<string>} - Expected outcomes
     */
    deriveExpectedOutcomes(strategy: object, objective: object, steps: any[]): Array<string>;
}
//# sourceMappingURL=agent-proposal-engine.d.ts.map