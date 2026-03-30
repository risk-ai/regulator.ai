export = AgentOrchestrator;
declare class AgentOrchestrator {
    constructor(stateGraph: any, agentRegistry: any);
    stateGraph: any;
    agentRegistry: any;
    proposalEngine: AgentProposalEngine;
    constraintEvaluator: ConstraintEvaluator;
    planTranslator: PlanTranslator;
    /**
     * Agent proposes plan for objective
     *
     * Full flow with trace integration:
     * 1. Generate plan (AgentProposalEngine)
     * 2. Evaluate constraints (ConstraintEvaluator)
     * 3. Translate to Phase 15 proposal (PlanTranslator)
     * 4. Persist proposal
     * 5. Emit trace events
     *
     * @param {string} agent_id - Agent identifier
     * @param {object} objective - Objective object
     * @param {object} context - Additional context
     * @returns {Promise<object>} - Result with proposal or rejection
     */
    proposeForObjective(agent_id: string, objective: object, context?: object): Promise<object>;
    /**
     * Emit trace event
     *
     * Integrates with execution ledger (Phase 8.3).
     * Records agent proposal lifecycle events.
     *
     * @param {string} event_type - Event type
     * @param {object} payload - Event payload
     */
    emitTrace(event_type: string, payload: object): Promise<void>;
    /**
     * Map event type to execution stage
     *
     * @private
     * @param {string} event_type - Event type
     * @returns {string} - Stage (planning, policy, execution, etc.)
     */
    private _mapEventToStage;
}
import AgentProposalEngine = require("./agent-proposal-engine.js");
import ConstraintEvaluator = require("./constraint-evaluator.js");
import PlanTranslator = require("./plan-translator.js");
//# sourceMappingURL=agent-orchestrator.d.ts.map