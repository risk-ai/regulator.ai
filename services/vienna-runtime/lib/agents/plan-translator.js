/**
 * Plan Translator — Phase 16 Stage 5
 * 
 * Converts agent plan → Phase 15 proposal(s).
 * Critical: Integrates with existing proposal system.
 */

const { createProposal } = require('../core/proposal-schema.js');
const { getMaxRiskTier } = require('../core/agent-proposal-schema.js');

class PlanTranslator {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Translate agent plan to Phase 15 proposal
   * 
   * Strategy: Multi-step plan → single proposal with composite intent
   * 
   * @param {object} agentProposal - Agent proposal object
   * @param {string} strategy - Translation strategy ('composite' or 'multiple')
   * @returns {Promise<object>} - Phase 15 proposal (persisted)
   */
  async translate(agentProposal, strategy = 'composite') {
    const plan = agentProposal.plan;

    // Build composite suggested intent
    const suggestedIntent = {
      intent_type: 'proposed',
      action: 'execute_plan',
      plan_id: plan.plan_id,
      steps: plan.steps,
      target_type: 'objective',
      target_id: plan.objective_id,
      risk_tier: getMaxRiskTier(plan),
      metadata: {
        agent_id: agentProposal.agent_id,
        agent_proposal_id: agentProposal.agent_proposal_id,
        is_multi_step: true
      }
    };

    // Create Phase 15 proposal
    const maxRisk = getMaxRiskTier(plan);
    const proposal = createProposal({
      proposal_type: this.inferProposalType(plan),
      objective_id: plan.objective_id,
      suggested_intent: suggestedIntent,
      rationale: plan.reasoning,
      risk_assessment: {
        risk_tier: maxRisk,
        impact: plan.risk_assessment?.impact || 'medium',
        reversibility: plan.risk_assessment?.reversibility || 'reversible'
      },
      confidence: 0.75, // Agent-generated = moderate confidence
      expires_in_seconds: 3600,
      metadata: {
        agent_id: agentProposal.agent_id,
        agent_proposal_id: agentProposal.agent_proposal_id,
        plan_id: plan.plan_id,
        step_count: plan.steps.length
      }
    });

    // Persist to State Graph
    if (this.stateGraph) {
      try {
        const persisted = this.stateGraph.createProposal(proposal);
        return persisted;
      } catch (error) {
        console.error('[PlanTranslator] Error persisting proposal:', error.message);
        throw error;
      }
    }

    return proposal;
  }

  /**
   * Infer proposal type from plan
   * 
   * @param {object} plan - Plan object
   * @returns {string} - Proposal type
   */
  inferProposalType(plan) {
    const actions = plan.steps.map(s => s.action);
    
    if (actions.includes('investigate')) return 'investigate';
    if (actions.includes('restore')) return 'restore';
    if (actions.includes('reconcile')) return 'reconcile';
    
    return 'escalate';
  }

  /**
   * Alternative: Translate to multiple proposals (one per step)
   * 
   * @param {object} agentProposal - Agent proposal object
   * @returns {Array} - Array of Phase 15 proposals
   */
  translateToMultiple(agentProposal) {
    const plan = agentProposal.plan;
    const proposals = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      const proposal = createProposal({
        proposal_type: this.inferProposalTypeFromStep(step),
        objective_id: plan.objective_id,
        suggested_intent: {
          intent_type: 'proposed',
          action: step.action,
          target_type: step.target_type,
          target_id: step.target_id,
          risk_tier: step.risk_tier || 'T0',
          parameters: step.parameters,
          metadata: {
            agent_id: agentProposal.agent_id,
            plan_id: plan.plan_id,
            step_id: step.step_id,
            step_index: i
          }
        },
        rationale: `Step ${i + 1} of ${plan.steps.length}: ${step.action}`,
        risk_assessment: {
          risk_tier: step.risk_tier || 'T0',
          impact: 'low',
          reversibility: 'reversible'
        },
        confidence: 0.7,
        expires_in_seconds: 3600
      });

      proposals.push(proposal);
    }

    return proposals;
  }

  /**
   * Infer proposal type from single step
   * 
   * @param {object} step - Plan step
   * @returns {string} - Proposal type
   */
  inferProposalTypeFromStep(step) {
    if (step.action === 'investigate') return 'investigate';
    if (step.action === 'restore') return 'restore';
    if (step.action === 'reconcile') return 'reconcile';
    return 'escalate';
  }
}

module.exports = PlanTranslator;
