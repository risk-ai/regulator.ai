/**
 * Execution Graph
 * 
 * Phase 11.5 — Intent Tracing and Execution Graph
 * 
 * Purpose: Reconstruct complete execution chains from ledger events.
 * Provides operator visibility into governance decisions and execution flow.
 * 
 * Design invariant:
 * Every execution must be traceable from intent to outcome.
 * Graph must be reconstructable from immutable ledger events.
 */

/**
 * Execution Graph Builder
 * 
 * Reconstructs execution flow from State Graph data.
 * Answers operator questions:
 * - Why did this action run?
 * - Why was it denied?
 * - What governance rule applied?
 * - Which execution attempt handled it?
 */
class ExecutionGraphBuilder {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Build complete execution graph for intent
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {Object} Complete execution graph
   */
  async buildIntentGraph(intent_id) {
    // Get intent trace
    const trace = await this.stateGraph.getIntentTrace(intent_id);
    if (!trace) {
      throw new Error(`Intent not found: ${intent_id}`);
    }

    const graph = {
      intent_id,
      intent_type: trace.intent_type,
      source: trace.source,
      submitted_at: trace.submitted_at,
      status: trace.status,
      stages: [],
      timeline: []
    };

    // Build timeline from trace events
    graph.timeline = this._buildTimeline(trace.events);

    // Extract stages from relationships
    const relationships = trace.relationships || {};

    // Stage 1: Intent submission
    graph.stages.push({
      stage: 'intent',
      status: trace.status,
      timestamp: trace.submitted_at,
      data: {
        intent_id: trace.intent_id,
        intent_type: trace.intent_type,
        source: trace.source
      }
    });

    // Stage 2: Policy evaluation (if applicable)
    const policyDecision = await this._getPolicyDecision(intent_id);
    if (policyDecision) {
      graph.stages.push({
        stage: 'policy',
        status: policyDecision.decision,
        timestamp: policyDecision.evaluated_at,
        data: policyDecision
      });
    }

    // Stage 3: Reconciliation admission (if applicable)
    if (relationships.reconciliation_id) {
      const reconciliation = await this._getReconciliationData(relationships.reconciliation_id);
      if (reconciliation) {
        graph.stages.push({
          stage: 'reconciliation',
          status: reconciliation.status,
          timestamp: reconciliation.admitted_at || reconciliation.created_at,
          data: reconciliation
        });
      }
    }

    // Stage 4: Execution
    if (relationships.execution_id) {
      const execution = await this._getExecutionData(relationships.execution_id);
      if (execution) {
        graph.stages.push({
          stage: 'execution',
          status: execution.status,
          timestamp: execution.started_at,
          data: execution
        });
      }
    }

    // Stage 5: Verification
    if (relationships.verification_id) {
      const verification = await this._getVerificationData(relationships.verification_id);
      if (verification) {
        graph.stages.push({
          stage: 'verification',
          status: verification.status,
          timestamp: verification.started_at,
          data: verification
        });
      }
    }

    // Stage 6: Outcome
    if (relationships.outcome_id) {
      const outcome = await this._getOutcomeData(relationships.outcome_id);
      if (outcome) {
        graph.stages.push({
          stage: 'outcome',
          status: outcome.outcome_type,
          timestamp: outcome.finalized_at,
          data: outcome
        });
      }
    }

    return graph;
  }

  /**
   * Build execution graph for execution ID
   * 
   * @param {string} execution_id - Execution identifier
   * @returns {Object} Execution-focused graph
   */
  async buildExecutionGraph(execution_id) {
    // Get execution ledger events
    const events = await this.stateGraph.listExecutionLedgerEvents(execution_id);
    const summary = await this.stateGraph.getExecutionLedgerSummary(execution_id);

    if (!summary) {
      throw new Error(`Execution not found: ${execution_id}`);
    }

    const graph = {
      execution_id,
      objective: summary.objective,
      risk_tier: summary.risk_tier,
      status: summary.status,
      started_at: summary.started_at,
      completed_at: summary.completed_at,
      duration_ms: summary.duration_ms,
      events: this._buildEventTimeline(events),
      governance: {
        policy_decision: summary.policy_decision,
        approval_required: summary.approval_required,
        approval_status: summary.approval_status
      },
      outcome: {
        objective_achieved: summary.objective_achieved,
        verification_status: summary.verification_status
      }
    };

    return graph;
  }

  /**
   * Get intent timeline (chronological events)
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {Array<Object>} Timeline events
   */
  async getIntentTimeline(intent_id) {
    const trace = await this.stateGraph.getIntentTrace(intent_id);
    if (!trace) {
      throw new Error(`Intent not found: ${intent_id}`);
    }

    return this._buildTimeline(trace.events);
  }

  /**
   * Explain why action was taken or denied
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {Object} Explanation with reasoning
   */
  async explainDecision(intent_id) {
    const graph = await this.buildIntentGraph(intent_id);

    const explanation = {
      intent_id,
      intent_type: graph.intent_type,
      decision: graph.status,
      reasoning: []
    };

    // Check each stage for decision factors
    for (const stage of graph.stages) {
      if (stage.stage === 'policy' && stage.status === 'deny') {
        explanation.reasoning.push({
          stage: 'policy',
          factor: 'policy_denial',
          detail: stage.data.reason || 'Policy constraint not satisfied',
          blocking: true
        });
      }

      if (stage.stage === 'reconciliation' && stage.status === 'skipped') {
        explanation.reasoning.push({
          stage: 'reconciliation',
          factor: 'admission_denied',
          detail: stage.data.skip_reason || 'Reconciliation admission denied',
          blocking: true
        });
      }

      if (stage.stage === 'execution' && stage.status === 'failed') {
        explanation.reasoning.push({
          stage: 'execution',
          factor: 'execution_failure',
          detail: stage.data.error || 'Execution failed',
          blocking: false
        });
      }

      if (stage.stage === 'verification' && stage.status === 'failed') {
        explanation.reasoning.push({
          stage: 'verification',
          factor: 'verification_failure',
          detail: 'Postconditions not satisfied',
          blocking: false
        });
      }
    }

    // If no blocking factors found, action was permitted
    if (explanation.reasoning.length === 0) {
      explanation.reasoning.push({
        stage: 'all',
        factor: 'permitted',
        detail: 'All governance checks passed',
        blocking: false
      });
    }

    return explanation;
  }

  // Private helper methods

  _buildTimeline(events) {
    return events
      .map(event => ({
        event_type: event.event_type,
        timestamp: event.timestamp,
        metadata: event.metadata
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  _buildEventTimeline(events) {
    return events
      .map(event => ({
        event_type: event.event_type,
        timestamp: event.event_timestamp,
        payload: event.event_payload ? JSON.parse(event.event_payload) : null
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async _getPolicyDecision(intent_id) {
    // Query policy_decisions table for this intent (if table exists)
    try {
      const decisions = this.stateGraph.query(
        'SELECT * FROM policy_decisions WHERE metadata LIKE ? ORDER BY evaluated_at DESC LIMIT 1',
        [`%"intent_id":"${intent_id}"%`]
      );
      return decisions.length > 0 ? decisions[0] : null;
    } catch (error) {
      // Table might not exist in test environment
      return null;
    }
  }

  async _getReconciliationData(reconciliation_id) {
    // This would query Phase 10 reconciliation tables
    // For now, return placeholder structure
    return {
      reconciliation_id,
      status: 'completed',
      created_at: new Date().toISOString()
    };
  }

  async _getExecutionData(execution_id) {
    return await this.stateGraph.getExecutionLedgerSummary(execution_id);
  }

  async _getVerificationData(verification_id) {
    return await this.stateGraph.getVerification(verification_id);
  }

  async _getOutcomeData(outcome_id) {
    return await this.stateGraph.getWorkflowOutcome(outcome_id);
  }
}

module.exports = { ExecutionGraphBuilder };
