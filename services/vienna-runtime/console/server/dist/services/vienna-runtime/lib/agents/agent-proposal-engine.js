/**
 * Agent Proposal Engine — Phase 16 Stage 3
 *
 * Generates plans from objectives/anomalies with intelligent reasoning.
 */
const { createAgentProposal } = require('../core/agent-proposal-schema.js');
class AgentProposalEngine {
    constructor(stateGraph, agentRegistry) {
        this.stateGraph = stateGraph;
        this.agentRegistry = agentRegistry;
    }
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
    async generatePlan(agent_id, objective, context = {}) {
        const agent = this.agentRegistry.get(agent_id);
        if (!agent) {
            throw new Error(`Agent not found: ${agent_id}`);
        }
        // Check agent capabilities
        if (agent.status !== 'active') {
            throw new Error('Agent is not active');
        }
        // Analyze objective and determine strategy
        const strategy = await this.selectStrategy(objective, agent, context);
        // Build steps based on strategy
        const steps = await this.buildStepsForStrategy(strategy, objective, agent, context);
        // Assess risk
        const riskAssessment = this.assessPlanRisk(steps, objective);
        // Generate reasoning
        const reasoning = this.generateReasoning(strategy, objective, steps, riskAssessment);
        // Expected outcomes
        const expectedOutcomes = this.deriveExpectedOutcomes(strategy, objective, steps);
        const agentProposal = createAgentProposal({
            agent_id,
            plan: {
                objective_id: objective.objective_id,
                steps,
                reasoning,
                expected_outcomes: expectedOutcomes,
                risk_assessment: riskAssessment,
                strategy: strategy.name
            },
            context: {
                ...context,
                strategy_name: strategy.name,
                confidence: strategy.confidence
            }
        });
        return agentProposal;
    }
    /**
     * Select strategy based on objective type and context
     *
     * @param {object} objective - Objective object
     * @param {object} agent - Agent object
     * @param {object} context - Additional context
     * @returns {Promise<object>} - Strategy object
     */
    async selectStrategy(objective, agent, context) {
        const strategies = [
            {
                name: 'investigate_then_restore',
                description: 'Safe investigation before restoration',
                conditions: ['objective.target_type === "service"', 'objective.desired_state.status === "healthy"'],
                confidence: 0.9,
                steps: ['investigate', 'reconcile', 'verify']
            },
            {
                name: 'immediate_restore',
                description: 'Direct restoration for known failures',
                conditions: ['context.known_failure === true'],
                confidence: 0.85,
                steps: ['reconcile', 'verify']
            },
            {
                name: 'escalate_only',
                description: 'Investigation and escalation without action',
                conditions: ['agent.risk_level === "T0_only"'],
                confidence: 1.0,
                steps: ['investigate', 'escalate']
            },
            {
                name: 'deep_analysis',
                description: 'Thorough analysis for complex issues',
                conditions: ['context.complexity === "high"'],
                confidence: 0.75,
                steps: ['investigate', 'analyze', 'plan_refinement', 'reconcile', 'verify']
            }
        ];
        // Select strategy based on objective type and agent capabilities
        if (objective.target_type === 'service' && agent.risk_level !== 'T0_only') {
            // Check if we have recent failure history
            const hasHistory = context.has_recent_failures || false;
            if (hasHistory) {
                return strategies.find(s => s.name === 'immediate_restore') || strategies[0];
            }
            return strategies[0]; // investigate_then_restore
        }
        if (agent.risk_level === 'T0_only') {
            return strategies.find(s => s.name === 'escalate_only') || strategies[2];
        }
        // Default: investigate then restore
        return strategies[0];
    }
    /**
     * Build steps for strategy
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {object} agent - Agent object
     * @param {object} context - Additional context
     * @returns {Promise<Array>} - Plan steps
     */
    async buildStepsForStrategy(strategy, objective, agent, context) {
        const steps = [];
        let stepIndex = 0;
        for (const stepType of strategy.steps) {
            const step = this.createStep(stepType, objective, stepIndex, steps);
            if (step) {
                steps.push(step);
                stepIndex++;
            }
        }
        return steps;
    }
    /**
     * Create individual step
     *
     * @param {string} stepType - Step type (investigate, reconcile, verify, etc.)
     * @param {object} objective - Objective object
     * @param {number} index - Step index
     * @param {Array} previousSteps - Previous steps (for dependencies)
     * @returns {object} - Step object
     */
    createStep(stepType, objective, index, previousSteps) {
        const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const stepId = `${planId}_step_${index}`;
        const stepTemplates = {
            investigate: {
                intent_type: 'proposed',
                action: 'investigate',
                target_type: objective.target_type,
                target_id: objective.target_id,
                risk_tier: 'T0',
                parameters: {
                    objective_id: objective.objective_id,
                    focus: 'current_state',
                    depth: 'basic'
                },
                dependencies: []
            },
            reconcile: {
                intent_type: 'proposed',
                action: 'reconcile',
                target_type: objective.target_type,
                target_id: objective.target_id,
                risk_tier: 'T1',
                parameters: {
                    objective_id: objective.objective_id,
                    desired_state: objective.desired_state,
                    strategy: 'safe_restart'
                },
                dependencies: previousSteps.length > 0 ? [previousSteps[previousSteps.length - 1].step_id] : []
            },
            verify: {
                intent_type: 'proposed',
                action: 'verify',
                target_type: objective.target_type,
                target_id: objective.target_id,
                risk_tier: 'T0',
                parameters: {
                    objective_id: objective.objective_id,
                    checks: ['health', 'status', 'stability']
                },
                dependencies: previousSteps.length > 0 ? [previousSteps[previousSteps.length - 1].step_id] : []
            },
            escalate: {
                intent_type: 'proposed',
                action: 'escalate',
                target_type: 'operator',
                target_id: 'default',
                risk_tier: 'T0',
                parameters: {
                    objective_id: objective.objective_id,
                    reason: 'investigation_complete',
                    urgency: 'medium'
                },
                dependencies: previousSteps.length > 0 ? [previousSteps[previousSteps.length - 1].step_id] : []
            },
            analyze: {
                intent_type: 'proposed',
                action: 'analyze',
                target_type: objective.target_type,
                target_id: objective.target_id,
                risk_tier: 'T0',
                parameters: {
                    objective_id: objective.objective_id,
                    analysis_type: 'deep',
                    include_history: true
                },
                dependencies: previousSteps.length > 0 ? [previousSteps[previousSteps.length - 1].step_id] : []
            }
        };
        const template = stepTemplates[stepType];
        if (!template)
            return null;
        return {
            ...template,
            step_id: stepId
        };
    }
    /**
     * Assess plan risk
     *
     * @param {Array} steps - Plan steps
     * @param {object} objective - Objective object
     * @returns {object} - Risk assessment
     */
    assessPlanRisk(steps, objective) {
        // Determine max risk tier
        const riskTiers = steps.map(s => s.risk_tier);
        const maxRisk = riskTiers.includes('T2') ? 'T2' : riskTiers.includes('T1') ? 'T1' : 'T0';
        // Assess reversibility
        const hasReversibleActions = steps.some(s => ['reconcile'].includes(s.action));
        const reversibility = hasReversibleActions ? 'partially_reversible' : 'reversible';
        // Assess impact
        let impact = 'low';
        if (objective.target_type === 'service' && steps.some(s => s.action === 'reconcile')) {
            impact = 'medium';
        }
        if (maxRisk === 'T2') {
            impact = 'high';
        }
        return {
            max_risk_tier: maxRisk,
            reversibility,
            impact,
            step_count: steps.length,
            t0_steps: steps.filter(s => s.risk_tier === 'T0').length,
            t1_steps: steps.filter(s => s.risk_tier === 'T1').length,
            t2_steps: steps.filter(s => s.risk_tier === 'T2').length
        };
    }
    /**
     * Generate reasoning for plan
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {Array} steps - Plan steps
     * @param {object} riskAssessment - Risk assessment
     * @returns {string} - Reasoning
     */
    generateReasoning(strategy, objective, steps, riskAssessment) {
        const parts = [
            `Strategy: ${strategy.name} (${strategy.description})`,
            `Objective: Restore ${objective.target_type} ${objective.target_id} to desired state`,
            `Approach: ${steps.length}-step plan with ${riskAssessment.max_risk_tier} max risk`,
            `Steps: ${steps.map(s => s.action).join(' → ')}`
        ];
        if (strategy.confidence < 0.9) {
            parts.push(`Note: Confidence ${strategy.confidence} - operator review recommended`);
        }
        return parts.join('. ');
    }
    /**
     * Derive expected outcomes
     *
     * @param {object} strategy - Strategy object
     * @param {object} objective - Objective object
     * @param {Array} steps - Plan steps
     * @returns {Array<string>} - Expected outcomes
     */
    deriveExpectedOutcomes(strategy, objective, steps) {
        const outcomes = [];
        if (steps.some(s => s.action === 'investigate')) {
            outcomes.push(`${objective.target_type} ${objective.target_id} state understood`);
        }
        if (steps.some(s => s.action === 'reconcile')) {
            outcomes.push(`${objective.target_type} ${objective.target_id} restored to desired state`);
        }
        if (steps.some(s => s.action === 'verify')) {
            outcomes.push('Verification confirms stable state');
        }
        if (steps.some(s => s.action === 'escalate')) {
            outcomes.push('Operator informed of findings');
        }
        outcomes.push(`Objective ${objective.objective_id} resolved`);
        return outcomes;
    }
}
module.exports = AgentProposalEngine;
//# sourceMappingURL=agent-proposal-engine.js.map