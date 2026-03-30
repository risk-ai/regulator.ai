export class IntentProposalEngine {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Propose intent from objective
     *
     * @param {object} objective - Objective object
     * @returns {Promise<object>} - Created proposal
     */
    proposeFromObjective(objective: object): Promise<object>;
    /**
     * Build intent object from template
     *
     * @param {object} objective - Objective object
     * @param {object} template - Proposal template
     * @returns {object} - Intent object
     */
    buildIntent(objective: object, template: object): object;
    /**
     * Check all preconditions
     *
     * @param {Array<string>} preconditions - Precondition names
     * @param {object} objective - Objective object
     * @returns {Promise<object>} - {passed: boolean, reason: string}
     */
    checkPreconditions(preconditions: Array<string>, objective: object): Promise<object>;
    /**
     * Calculate proposal confidence
     *
     * @param {object} objective - Objective object
     * @param {object} template - Proposal template
     * @returns {number} - Confidence score (0.0-1.0)
     */
    calculateConfidence(objective: object, template: object): number;
    /**
     * Interpolate template string
     *
     * @param {string} template - Template with {placeholders}
     * @param {object} objective - Objective for values
     * @returns {string} - Interpolated string
     */
    interpolate(template: string, objective: object): string;
    /**
     * Create escalation proposal (fallback)
     *
     * @param {object} objective - Objective object
     * @param {string} reason - Escalation reason
     * @returns {object} - Escalation proposal
     */
    createEscalationProposal(objective: object, reason: string): object;
    /**
     * Create blocked proposal
     *
     * @param {object} objective - Objective object
     * @param {string} reason - Blocking reason
     * @returns {object} - Blocked proposal (escalation)
     */
    createBlockedProposal(objective: object, reason: string): object;
}
export namespace PROPOSAL_TEMPLATES {
    namespace service_health {
        let proposal_type: string;
        let intent_action: string;
        let risk_tier: string;
        let rationale_template: string;
        let preconditions: string[];
        namespace verification {
            let template: string;
            let timeout: number;
        }
        let impact: string;
        let reversibility: string;
    }
    namespace objective_recovery {
        let proposal_type_1: string;
        export { proposal_type_1 as proposal_type };
        let intent_action_1: string;
        export { intent_action_1 as intent_action };
        let risk_tier_1: string;
        export { risk_tier_1 as risk_tier };
        let rationale_template_1: string;
        export { rationale_template_1 as rationale_template };
        let preconditions_1: string[];
        export { preconditions_1 as preconditions };
        export namespace verification_1 {
            let template_1: string;
            export { template_1 as template };
            let timeout_1: number;
            export { timeout_1 as timeout };
        }
        export { verification_1 as verification };
        let impact_1: string;
        export { impact_1 as impact };
        let reversibility_1: string;
        export { reversibility_1 as reversibility };
    }
    namespace execution_stability {
        let proposal_type_2: string;
        export { proposal_type_2 as proposal_type };
        let intent_action_2: string;
        export { intent_action_2 as intent_action };
        let risk_tier_2: string;
        export { risk_tier_2 as risk_tier };
        let rationale_template_2: string;
        export { rationale_template_2 as rationale_template };
        let preconditions_2: string[];
        export { preconditions_2 as preconditions };
        export namespace verification_2 {
            let template_2: string;
            export { template_2 as template };
            let timeout_2: number;
            export { timeout_2 as timeout };
        }
        export { verification_2 as verification };
        let impact_2: string;
        export { impact_2 as impact };
        let reversibility_2: string;
        export { reversibility_2 as reversibility };
    }
    namespace policy_review {
        let proposal_type_3: string;
        export { proposal_type_3 as proposal_type };
        let intent_action_3: string;
        export { intent_action_3 as intent_action };
        let risk_tier_3: string;
        export { risk_tier_3 as risk_tier };
        let rationale_template_3: string;
        export { rationale_template_3 as rationale_template };
        let preconditions_3: any[];
        export { preconditions_3 as preconditions };
        export namespace verification_3 {
            let template_3: string;
            export { template_3 as template };
            let timeout_3: number;
            export { timeout_3 as timeout };
        }
        export { verification_3 as verification };
        let impact_3: string;
        export { impact_3 as impact };
        let reversibility_3: string;
        export { reversibility_3 as reversibility };
    }
    namespace verification_completion {
        let proposal_type_4: string;
        export { proposal_type_4 as proposal_type };
        let intent_action_4: string;
        export { intent_action_4 as intent_action };
        let risk_tier_4: string;
        export { risk_tier_4 as risk_tier };
        let rationale_template_4: string;
        export { rationale_template_4 as rationale_template };
        let preconditions_4: any[];
        export { preconditions_4 as preconditions };
        export namespace verification_4 {
            let template_4: string;
            export { template_4 as template };
            let timeout_4: number;
            export { timeout_4 as timeout };
        }
        export { verification_4 as verification };
        let impact_4: string;
        export { impact_4 as impact };
        let reversibility_4: string;
        export { reversibility_4 as reversibility };
    }
    namespace graph_integrity {
        let proposal_type_5: string;
        export { proposal_type_5 as proposal_type };
        let intent_action_5: string;
        export { intent_action_5 as intent_action };
        let risk_tier_5: string;
        export { risk_tier_5 as risk_tier };
        let rationale_template_5: string;
        export { rationale_template_5 as rationale_template };
        let preconditions_5: any[];
        export { preconditions_5 as preconditions };
        export namespace verification_5 {
            let template_5: string;
            export { template_5 as template };
            let timeout_5: number;
            export { timeout_5 as timeout };
        }
        export { verification_5 as verification };
        let impact_5: string;
        export { impact_5 as impact };
        let reversibility_5: string;
        export { reversibility_5 as reversibility };
    }
}
export namespace PRECONDITION_CHECKERS {
    function service_exists(objective: any, stateGraph: any): Promise<{
        passed: boolean;
        reason: string;
    }>;
    function not_recently_restarted(objective: any, stateGraph: any): Promise<{
        passed: boolean;
        reason: string;
    }>;
    function objective_exists(objective: any, stateGraph: any): Promise<{
        passed: boolean;
        reason: string;
    }>;
    function not_recently_investigated(objective: any, stateGraph: any): Promise<{
        passed: boolean;
        reason: string;
    }>;
    function no_active_reconciliation(objective: any, stateGraph: any): Promise<{
        passed: boolean;
        reason: string;
    }>;
}
//# sourceMappingURL=intent-proposal-engine.d.ts.map