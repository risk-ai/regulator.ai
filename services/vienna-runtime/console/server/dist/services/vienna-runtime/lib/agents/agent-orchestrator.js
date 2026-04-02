/**
 * Agent Orchestrator — Phase 16 (Complete)
 *
 * Coordinates agent proposal flow with full trace integration.
 */
const AgentProposalEngine = require('./agent-proposal-engine.js');
const ConstraintEvaluator = require('./constraint-evaluator.js');
const PlanTranslator = require('./plan-translator.js');
class AgentOrchestrator {
    constructor(stateGraph, agentRegistry) {
        this.stateGraph = stateGraph;
        this.agentRegistry = agentRegistry;
        this.proposalEngine = new AgentProposalEngine(stateGraph, agentRegistry);
        this.constraintEvaluator = new ConstraintEvaluator();
        this.planTranslator = new PlanTranslator(stateGraph);
    }
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
    async proposeForObjective(agent_id, objective, context = {}) {
        console.log(`[AgentOrchestrator] Agent ${agent_id} proposing for objective ${objective.objective_id}`);
        // Emit trace: Agent proposal started
        await this.emitTrace('agent_proposal_started', {
            agent_id,
            objective_id: objective.objective_id,
            timestamp: new Date().toISOString()
        });
        // Check if agent is active and can propose
        const agent = this.agentRegistry.get(agent_id);
        if (!agent) {
            return {
                status: 'rejected',
                reason: 'Agent not found',
                agent_id,
                objective_id: objective.objective_id
            };
        }
        if (agent.status !== 'active') {
            return {
                status: 'rejected',
                reason: `Agent status is ${agent.status}`,
                agent_id,
                objective_id: objective.objective_id
            };
        }
        // Check circuit breaker
        const breakerStatus = this.agentRegistry.getCircuitBreakerStatus(agent_id);
        if (breakerStatus.open) {
            return {
                status: 'rejected',
                reason: `Circuit breaker open: ${breakerStatus.reason}`,
                agent_id,
                objective_id: objective.objective_id
            };
        }
        // Check rate limit
        const recentCount = await this.agentRegistry.getRecentProposalCount(agent_id);
        const { checkRateLimit } = require('../core/agent-schema.js');
        const rateLimitCheck = checkRateLimit(agent, recentCount);
        if (!rateLimitCheck.allowed) {
            return {
                status: 'rejected',
                reason: rateLimitCheck.reason,
                agent_id,
                objective_id: objective.objective_id
            };
        }
        try {
            // Generate plan
            const agentProposal = await this.proposalEngine.generatePlan(agent_id, objective, context);
            const plan = agentProposal.plan;
            console.log(`[AgentOrchestrator] Plan generated: ${plan.plan_id}`);
            // Emit trace: Plan generated
            await this.emitTrace('plan_generated', {
                agent_id,
                objective_id: objective.objective_id,
                plan_id: plan.plan_id,
                step_count: plan.steps.length,
                strategy: plan.strategy,
                timestamp: new Date().toISOString()
            });
            // Evaluate constraints
            const constraintResult = await this.constraintEvaluator.evaluate(agentProposal, agent);
            // Emit trace: Constraints evaluated
            await this.emitTrace('constraint_evaluated', {
                agent_id,
                plan_id: plan.plan_id,
                allowed: constraintResult.allowed,
                violations: constraintResult.violations,
                timestamp: new Date().toISOString()
            });
            if (!constraintResult.allowed) {
                console.log(`[AgentOrchestrator] Plan rejected by constraints:`, constraintResult.violations || 'No violations provided');
                // Record failure for circuit breaker
                this.agentRegistry.recordFailure(agent_id);
                return {
                    status: 'constraint_violation',
                    agent_id,
                    objective_id: objective.objective_id,
                    plan_id: plan.plan_id,
                    violations: constraintResult.violations || [],
                    constraint_result: constraintResult
                };
            }
            // Translate to Phase 15 proposal
            const proposal = await this.planTranslator.translate(agentProposal, 'composite');
            // Emit trace: Proposal created
            await this.emitTrace('agent_proposal_created', {
                agent_id,
                objective_id: objective.objective_id,
                plan_id: plan.plan_id,
                proposal_id: proposal.proposal_id,
                risk_tier: proposal.suggested_intent.risk_tier,
                timestamp: new Date().toISOString()
            });
            console.log(`[AgentOrchestrator] Proposal created: ${proposal.proposal_id}`);
            // Record success for circuit breaker
            this.agentRegistry.recordSuccess(agent_id);
            return {
                status: 'proposed',
                agent_id,
                objective_id: objective.objective_id,
                plan_id: plan.plan_id,
                proposal_id: proposal.proposal_id,
                proposal
            };
        }
        catch (error) {
            console.error(`[AgentOrchestrator] Error proposing plan: ${error.message}`);
            // Emit trace: Error
            await this.emitTrace('agent_proposal_error', {
                agent_id,
                objective_id: objective.objective_id,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            // Record failure for circuit breaker
            this.agentRegistry.recordFailure(agent_id);
            return {
                status: 'error',
                agent_id,
                objective_id: objective.objective_id,
                error: error.message
            };
        }
    }
    /**
     * Emit trace event
     *
     * Integrates with execution ledger (Phase 8.3).
     * Records agent proposal lifecycle events.
     *
     * @param {string} event_type - Event type
     * @param {object} payload - Event payload
     */
    async emitTrace(event_type, payload) {
        if (!this.stateGraph) {
            console.log(`[AgentOrchestrator] Trace: ${event_type}`, payload);
            return;
        }
        try {
            // Map event type to stage
            const stage = this._mapEventToStage(event_type);
            // Generate execution_id (use proposal_id or plan_id as context)
            const execution_id = payload.proposal_id || payload.plan_id || `agent-${Date.now()}`;
            // Append to execution ledger
            await this.stateGraph.appendLedgerEvent({
                execution_id,
                event_type: `agent.${event_type}`,
                stage,
                actor_type: 'agent',
                actor_id: payload.agent_id,
                event_timestamp: payload.timestamp || new Date().toISOString(),
                objective: payload.objective_id || null,
                payload_json: payload
            });
        }
        catch (error) {
            console.error(`[AgentOrchestrator] Error emitting trace: ${error.message}`);
        }
    }
    /**
     * Map event type to execution stage
     *
     * @private
     * @param {string} event_type - Event type
     * @returns {string} - Stage (planning, policy, execution, etc.)
     */
    _mapEventToStage(event_type) {
        const stageMap = {
            'agent_proposal_started': 'planning',
            'plan_generated': 'planning',
            'constraint_evaluated': 'policy',
            'agent_proposal_created': 'planning',
            'agent_proposal_rejected': 'policy',
            'agent_proposal_error': 'execution'
        };
        return stageMap[event_type] || 'unknown';
    }
}
module.exports = AgentOrchestrator;
//# sourceMappingURL=agent-orchestrator.js.map