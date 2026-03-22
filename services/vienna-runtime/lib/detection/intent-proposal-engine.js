/**
 * Intent Proposal Engine — Phase 15 Stage 4
 * 
 * Generates proposed intents from objectives with precondition checking.
 */

const { createProposal } = require('../core/proposal-schema.js');

/**
 * Proposal Templates
 * 
 * Maps objective_type → proposal template
 */
const PROPOSAL_TEMPLATES = {
  service_health: {
    proposal_type: 'restore',
    intent_action: 'restart_service',
    risk_tier: 'T1',
    rationale_template: 'Service {target_id} is unhealthy. Restart may restore operation.',
    preconditions: ['service_exists', 'not_recently_restarted'],
    verification: {
      template: 'service_recovery',
      timeout: 300
    },
    impact: 'medium',
    reversibility: 'reversible'
  },
  objective_recovery: {
    proposal_type: 'investigate',
    intent_action: 'investigate_objective',
    risk_tier: 'T0',
    rationale_template: 'Objective {target_id} has stalled. Investigation recommended.',
    preconditions: ['objective_exists', 'not_recently_investigated'],
    verification: {
      template: 'investigation_created',
      timeout: 60
    },
    impact: 'low',
    reversibility: 'safe'
  },
  execution_stability: {
    proposal_type: 'reconcile',
    intent_action: 'reconcile_state',
    risk_tier: 'T1',
    rationale_template: 'Execution failures detected on {target_id}. State reconciliation may resolve.',
    preconditions: ['no_active_reconciliation'],
    verification: {
      template: 'execution_stable',
      timeout: 300
    },
    impact: 'medium',
    reversibility: 'reversible'
  },
  policy_review: {
    proposal_type: 'escalate',
    intent_action: 'escalate_to_operator',
    risk_tier: 'T0',
    rationale_template: 'Policy {target_id} blocking repeatedly. Operator review needed.',
    preconditions: [],
    verification: {
      template: 'operator_notified',
      timeout: 30
    },
    impact: 'none',
    reversibility: 'safe'
  },
  verification_completion: {
    proposal_type: 'escalate',
    intent_action: 'escalate_verification',
    risk_tier: 'T0',
    rationale_template: 'Verification {target_id} overdue. Manual review needed.',
    preconditions: [],
    verification: {
      template: 'escalation_recorded',
      timeout: 30
    },
    impact: 'none',
    reversibility: 'safe'
  },
  graph_integrity: {
    proposal_type: 'reconcile',
    intent_action: 'repair_graph_linkage',
    risk_tier: 'T1',
    rationale_template: 'Graph linkage broken for {target_id}. Repair recommended.',
    preconditions: [],
    verification: {
      template: 'graph_consistent',
      timeout: 60
    },
    impact: 'low',
    reversibility: 'reversible'
  }
};

/**
 * Precondition Checkers
 * 
 * Functions that verify preconditions before proposal creation
 */
const PRECONDITION_CHECKERS = {
  service_exists: async (objective, stateGraph) => {
    const service = stateGraph.getService(objective.target_id);
    return { passed: !!service, reason: service ? null : 'Service not found' };
  },

  not_recently_restarted: async (objective, stateGraph) => {
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const recent = stateGraph.listExecutionLedger({
      target_id: objective.target_id,
      created_after: fiveMinutesAgo,
      limit: 1
    });
    return { passed: recent.length === 0, reason: recent.length > 0 ? 'Recently restarted' : null };
  },

  objective_exists: async (objective, stateGraph) => {
    const target = stateGraph.query(`
      SELECT * FROM managed_objectives WHERE objective_id = ? LIMIT 1
    `, [objective.target_id])[0];
    return { passed: !!target, reason: target ? null : 'Objective not found' };
  },

  not_recently_investigated: async (objective, stateGraph) => {
    const investigations = stateGraph.listInvestigations({
      objective_id: objective.target_id,
      status: 'investigating',
      limit: 1
    });
    return { passed: investigations.length === 0, reason: investigations.length > 0 ? 'Already investigating' : null };
  },

  no_active_reconciliation: async (objective, stateGraph) => {
    const active = stateGraph.query(`
      SELECT * FROM managed_objectives
      WHERE target_id = ?
      AND status = 'reconciling'
      LIMIT 1
    `, [objective.target_id]);
    return { passed: active.length === 0, reason: active.length > 0 ? 'Reconciliation in progress' : null };
  }
};

class IntentProposalEngine {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Propose intent from objective
   * 
   * @param {object} objective - Objective object
   * @returns {Promise<object>} - Created proposal
   */
  async proposeFromObjective(objective) {
    const template = PROPOSAL_TEMPLATES[objective.objective_type];
    
    if (!template) {
      return this.createEscalationProposal(objective, 'No automatic proposal available');
    }

    // Check preconditions
    const preconditionCheck = await this.checkPreconditions(template.preconditions, objective);
    if (!preconditionCheck.passed) {
      return this.createBlockedProposal(objective, preconditionCheck.reason);
    }

    // Build suggested intent
    const suggestedIntent = this.buildIntent(objective, template);

    // Create proposal
    const proposalData = createProposal({
      proposal_type: template.proposal_type,
      objective_id: objective.objective_id,
      anomaly_id: objective.metadata?.declared_from_anomaly,
      suggested_intent: suggestedIntent,
      rationale: this.interpolate(template.rationale_template, objective),
      risk_assessment: {
        risk_tier: template.risk_tier,
        impact: template.impact,
        reversibility: template.reversibility
      },
      confidence: this.calculateConfidence(objective, template),
      expires_in_seconds: 3600  // 1 hour
    });

    const proposal = this.stateGraph.createProposal(proposalData);

    console.log(`[IntentProposal] Created proposal ${proposal.proposal_id} for objective ${objective.objective_id}`);

    return proposal;
  }

  /**
   * Build intent object from template
   * 
   * @param {object} objective - Objective object
   * @param {object} template - Proposal template
   * @returns {object} - Intent object
   */
  buildIntent(objective, template) {
    return {
      intent_type: 'proposed',
      action: template.intent_action,
      target_type: objective.target_type,
      target_id: objective.target_id,
      parameters: {
        objective_id: objective.objective_id
      },
      verification_spec: template.verification,
      risk_tier: template.risk_tier,
      metadata: {
        proposed_from_objective: objective.objective_id,
        proposal_confidence: this.calculateConfidence(objective, template)
      }
    };
  }

  /**
   * Check all preconditions
   * 
   * @param {Array<string>} preconditions - Precondition names
   * @param {object} objective - Objective object
   * @returns {Promise<object>} - {passed: boolean, reason: string}
   */
  async checkPreconditions(preconditions, objective) {
    for (const preconditionName of preconditions) {
      const checker = PRECONDITION_CHECKERS[preconditionName];
      if (!checker) {
        console.warn(`[IntentProposal] Unknown precondition: ${preconditionName}`);
        continue;
      }

      const result = await checker(objective, this.stateGraph);
      if (!result.passed) {
        return { passed: false, reason: result.reason };
      }
    }

    return { passed: true };
  }

  /**
   * Calculate proposal confidence
   * 
   * @param {object} objective - Objective object
   * @param {object} template - Proposal template
   * @returns {number} - Confidence score (0.0-1.0)
   */
  calculateConfidence(objective, template) {
    let confidence = 0.7;  // Base confidence

    // Boost if anomaly confidence high
    if (objective.metadata?.anomaly_confidence > 0.8) {
      confidence += 0.1;
    }

    // Reduce if objective is brand new
    if (!objective.last_evaluated_at) {
      confidence -= 0.1;
    }

    // Boost if template is escalation (low risk)
    if (template.proposal_type === 'escalate') {
      confidence += 0.15;
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Interpolate template string
   * 
   * @param {string} template - Template with {placeholders}
   * @param {object} objective - Objective for values
   * @returns {string} - Interpolated string
   */
  interpolate(template, objective) {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return objective[key] || key;
    });
  }

  /**
   * Create escalation proposal (fallback)
   * 
   * @param {object} objective - Objective object
   * @param {string} reason - Escalation reason
   * @returns {object} - Escalation proposal
   */
  createEscalationProposal(objective, reason) {
    const proposalData = createProposal({
      proposal_type: 'escalate',
      objective_id: objective.objective_id,
      suggested_intent: {
        intent_type: 'proposed',
        action: 'escalate_to_operator',
        parameters: { reason },
        risk_tier: 'T0'
      },
      rationale: `Objective ${objective.objective_id} requires operator review: ${reason}`,
      risk_assessment: {
        risk_tier: 'T0',
        impact: 'none',
        reversibility: 'safe'
      },
      confidence: 1.0,
      expires_in_seconds: 3600
    });

    return this.stateGraph.createProposal(proposalData);
  }

  /**
   * Create blocked proposal
   * 
   * @param {object} objective - Objective object
   * @param {string} reason - Blocking reason
   * @returns {object} - Blocked proposal (escalation)
   */
  createBlockedProposal(objective, reason) {
    return this.createEscalationProposal(objective, `Precondition failed: ${reason}`);
  }
}

module.exports = {
  IntentProposalEngine,
  PROPOSAL_TEMPLATES,
  PRECONDITION_CHECKERS
};
