/**
 * Intent Tracing
 * 
 * Phase 11.5 — Intent Tracing and Execution Graph
 * 
 * Purpose: Track full lifecycle of every intent through Vienna OS.
 * Provides execution graph reconstruction and operator visibility.
 * 
 * Design invariant:
 * Every intent must produce a complete trace from submission to outcome.
 * Trace must connect: intent_id → reconciliation_id → execution_attempt_id
 */

// Intent tracing doesn't generate IDs, gateway does

/**
 * Intent Trace Event
 * 
 * @typedef {Object} IntentTraceEvent
 * @property {string} event_type - Type of lifecycle event
 * @property {string} timestamp - ISO timestamp
 * @property {Object} metadata - Event-specific metadata
 */

/**
 * Intent Trace
 * 
 * @typedef {Object} IntentTrace
 * @property {string} intent_id - Unique intent identifier
 * @property {string} intent_type - Intent type (restore_objective, etc.)
 * @property {string} source - Source type (operator, agent, system)
 * @property {string} submitted_at - ISO timestamp
 * @property {string} status - Current trace status
 * @property {Array<IntentTraceEvent>} events - Lifecycle events
 * @property {Object} relationships - Related entity IDs
 */

class IntentTracer {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Record intent lifecycle event
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} event_type - Event type
   * @param {Object} metadata - Event metadata
   */
  async recordEvent(intent_id, event_type, metadata = {}) {
    const event = {
      event_type,
      timestamp: new Date().toISOString(),
      metadata
    };

    // Append to intent_traces table
    await this.stateGraph.appendIntentTraceEvent(intent_id, event);

    return event;
  }

  /**
   * Get intent trace by ID
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {IntentTrace|null} Complete intent trace
   */
  async getTrace(intent_id) {
    return await this.stateGraph.getIntentTrace(intent_id);
  }

  /**
   * List intent traces with filters
   * 
   * @param {Object} filters - Query filters
   * @returns {Array<IntentTrace>} Matching traces
   */
  async listTraces(filters = {}) {
    return await this.stateGraph.listIntentTraces(filters);
  }

  /**
   * Build execution graph for intent
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {Object} Execution graph structure
   */
  async buildExecutionGraph(intent_id) {
    const trace = await this.getTrace(intent_id);
    if (!trace) {
      return null;
    }

    // Build graph structure
    const graph = {
      intent: {
        intent_id: trace.intent_id,
        intent_type: trace.intent_type,
        source: trace.source,
        submitted_at: trace.submitted_at,
        status: trace.status
      },
      nodes: [],
      edges: []
    };

    // Extract relationships from trace
    const relationships = trace.relationships || {};

    // Add intent node
    graph.nodes.push({
      id: trace.intent_id,
      type: 'intent',
      label: trace.intent_type,
      timestamp: trace.submitted_at,
      status: trace.status
    });

    // Add reconciliation node if exists
    if (relationships.reconciliation_id) {
      const reconciliation = await this._getReconciliationNode(relationships.reconciliation_id);
      if (reconciliation) {
        graph.nodes.push(reconciliation);
        graph.edges.push({
          from: trace.intent_id,
          to: relationships.reconciliation_id,
          type: 'triggers'
        });
      }
    }

    // Add execution node if exists
    if (relationships.execution_id) {
      const execution = await this._getExecutionNode(relationships.execution_id);
      if (execution) {
        graph.nodes.push(execution);
        graph.edges.push({
          from: relationships.reconciliation_id || trace.intent_id,
          to: relationships.execution_id,
          type: 'executes'
        });
      }
    }

    // Add verification node if exists
    if (relationships.verification_id) {
      const verification = await this._getVerificationNode(relationships.verification_id);
      if (verification) {
        graph.nodes.push(verification);
        graph.edges.push({
          from: relationships.execution_id || trace.intent_id,
          to: relationships.verification_id,
          type: 'verifies'
        });
      }
    }

    // Add outcome node if exists
    if (relationships.outcome_id) {
      const outcome = await this._getOutcomeNode(relationships.outcome_id);
      if (outcome) {
        graph.nodes.push(outcome);
        graph.edges.push({
          from: relationships.verification_id || relationships.execution_id || trace.intent_id,
          to: relationships.outcome_id,
          type: 'concludes'
        });
      }
    }

    return graph;
  }

  /**
   * Get intent timeline (chronological event list)
   * 
   * @param {string} intent_id - Intent identifier
   * @returns {Array<Object>} Timeline events
   */
  async getIntentTimeline(intent_id) {
    const trace = await this.getTrace(intent_id);
    if (!trace) {
      return null;
    }

    // Return events in chronological order
    return trace.events.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }

  /**
   * Link intent to reconciliation
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} reconciliation_id - Reconciliation identifier
   */
  async linkReconciliation(intent_id, reconciliation_id) {
    await this.stateGraph.updateIntentRelationship(intent_id, {
      reconciliation_id
    });
  }

  /**
   * Link intent to execution
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} execution_id - Execution identifier
   */
  async linkExecution(intent_id, execution_id) {
    await this.stateGraph.updateIntentRelationship(intent_id, {
      execution_id
    });
  }

  /**
   * Link intent to verification
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} verification_id - Verification identifier
   */
  async linkVerification(intent_id, verification_id) {
    await this.stateGraph.updateIntentRelationship(intent_id, {
      verification_id
    });
  }

  /**
   * Link intent to outcome
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} outcome_id - Outcome identifier
   */
  async linkOutcome(intent_id, outcome_id) {
    await this.stateGraph.updateIntentRelationship(intent_id, {
      outcome_id
    });
  }

  /**
   * Update intent status
   * 
   * @param {string} intent_id - Intent identifier
   * @param {string} status - New status
   */
  async updateStatus(intent_id, status) {
    await this.stateGraph.updateIntentStatus(intent_id, status);
  }

  // Private helper methods for graph construction

  async _getReconciliationNode(reconciliation_id) {
    // Query reconciliation data from State Graph
    // This would integrate with Phase 10 reconciliation tables
    return {
      id: reconciliation_id,
      type: 'reconciliation',
      label: 'Reconciliation',
      timestamp: new Date().toISOString(),
      status: 'unknown' // Would be populated from actual data
    };
  }

  async _getExecutionNode(execution_id) {
    // Query execution ledger
    const summary = await this.stateGraph.getExecutionLedgerSummary(execution_id);
    if (!summary) {
      return null;
    }

    return {
      id: execution_id,
      type: 'execution',
      label: summary.objective || 'Execution',
      timestamp: summary.started_at,
      status: summary.status,
      metadata: {
        risk_tier: summary.risk_tier,
        target_id: summary.target_id,
        duration_ms: summary.duration_ms
      }
    };
  }

  async _getVerificationNode(verification_id) {
    // Query verification table
    const verification = await this.stateGraph.getVerification(verification_id);
    if (!verification) {
      return null;
    }

    return {
      id: verification_id,
      type: 'verification',
      label: verification.verification_type,
      timestamp: verification.started_at,
      status: verification.status,
      metadata: {
        objective_achieved: verification.objective_achieved
      }
    };
  }

  async _getOutcomeNode(outcome_id) {
    // Query workflow_outcomes table
    const outcome = await this.stateGraph.getWorkflowOutcome(outcome_id);
    if (!outcome) {
      return null;
    }

    return {
      id: outcome_id,
      type: 'outcome',
      label: outcome.outcome_type,
      timestamp: outcome.finalized_at,
      status: outcome.outcome_type,
      metadata: {
        objective_achieved: outcome.objective_achieved,
        summary: outcome.summary
      }
    };
  }
}

module.exports = { IntentTracer };
