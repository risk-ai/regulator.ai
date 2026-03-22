/**
 * Phase 9.5 — Remediation Trigger Integration
 * 
 * Core integration layer between objective evaluation and governed execution pipeline.
 * 
 * Architectural invariant:
 * > Objectives may trigger remediation, but they may not bypass the governed execution pipeline.
 * 
 * Flow:
 * Objective violation → remediation trigger → Plan → Policy → Warrant → Execution → Verification → Outcome → Objective state update
 */

const { getStateGraph } = require('../state/state-graph');
const { createPlan } = require('./plan-schema');
const { generatePlan } = require('./plan-generator');

/**
 * Remediation trigger result
 * @typedef {Object} RemediationTriggerResult
 * @property {string} objective_id
 * @property {string} objective_state - Current objective state after trigger
 * @property {string|null} triggered_plan_id - ID of remediation plan created
 * @property {string|null} execution_id - Execution ledger ID (if remediation started)
 * @property {Object|null} policy_decision - Policy evaluation summary
 * @property {Object|null} remediation_outcome - Final remediation outcome
 * @property {Object|null} verification_outcome - Verification result
 * @property {boolean} triggered - Whether remediation was triggered
 * @property {string|null} suppression_reason - Why remediation was not triggered (if applicable)
 */

/**
 * Check if objective is in a remediating state (deduplication)
 * @param {string} state - Current objective state
 * @returns {boolean}
 */
function isRemediating(state) {
  const remediatingStates = [
    'remediation_triggered',
    'remediation_running',
    'verification'
  ];
  return remediatingStates.includes(state);
}

/**
 * Check if objective is eligible for remediation
 * @param {Object} objective - Objective from State Graph
 * @returns {{eligible: boolean, reason?: string}}
 */
function checkRemediationEligibility(objective) {
  // Must be in VIOLATION_DETECTED state FIRST (check state before other conditions)
  if (objective.status !== 'violation_detected') {
    // Deduplication: prevent duplicate triggers
    if (isRemediating(objective.status)) {
      return { eligible: false, reason: 'remediation_already_active' };
    }
    
    // Archived objectives cannot trigger remediation
    if (objective.status === 'archived') {
      return { eligible: false, reason: 'objective_archived' };
    }

    // Suspended objectives cannot trigger remediation
    if (objective.status === 'suspended') {
      return { eligible: false, reason: 'objective_suspended' };
    }
    
    // Invalid state for remediation trigger
    return { eligible: false, reason: `invalid_state_${objective.status}` };
  }

  // Disabled objectives cannot trigger remediation
  if (objective.disabled) {
    return { eligible: false, reason: 'objective_disabled' };
  }

  // Must have a remediation plan reference
  if (!objective.remediation_plan) {
    return { eligible: false, reason: 'no_remediation_plan' };
  }

  return { eligible: true };
}

/**
 * Trigger remediation workflow for a violated objective
 * 
 * @param {string} objectiveId - Objective ID
 * @param {Object} context - Execution context
 * @param {Object} context.chatActionBridge - Chat action bridge instance (for execution)
 * @param {string} context.triggered_by - Who/what triggered remediation
 * @returns {Promise<RemediationTriggerResult>}
 */
async function triggerRemediation(objectiveId, context = {}) {
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  // Load objective
  const objective = stateGraph.getObjective(objectiveId);
  if (!objective) {
    throw new Error(`Objective not found: ${objectiveId}`);
  }

  // Check eligibility
  const eligibility = checkRemediationEligibility(objective);
  if (!eligibility.eligible) {
    return {
      objective_id: objectiveId,
      objective_state: objective.status,
      triggered_plan_id: null,
      execution_id: null,
      policy_decision: null,
      remediation_outcome: null,
      verification_outcome: null,
      triggered: false,
      suppression_reason: eligibility.reason
    };
  }

  // Transition: VIOLATION_DETECTED → REMEDIATION_TRIGGERED
  stateGraph.updateObjectiveStatus(
    objectiveId,
    'remediation_triggered',
    'evaluation', // transition_reason
    {
      triggered_by: context.triggered_by || 'objective_evaluator',
      remediation_plan: objective.remediation_plan,
      timestamp: new Date().toISOString()
    }
  );

  // Load remediation plan from State Graph
  const remediationPlan = stateGraph.getPlan(objective.remediation_plan);
  if (!remediationPlan) {
    // Plan not found - transition to FAILED
    stateGraph.updateObjectiveStatus(
      objectiveId,
      'failed',
      'execution',
      {
        error: 'remediation_plan_not_found',
        plan_id: objective.remediation_plan
      }
    );

    return {
      objective_id: objectiveId,
      objective_state: 'failed',
      triggered_plan_id: objective.remediation_plan,
      execution_id: null,
      policy_decision: null,
      remediation_outcome: { success: false, error: 'remediation_plan_not_found' },
      verification_outcome: null,
      triggered: false,
      suppression_reason: 'plan_not_found'
    };
  }

  // Execute remediation through governed pipeline
  // This requires chat-action-bridge integration
  if (!context.chatActionBridge) {
    throw new Error('chatActionBridge required in context for remediation execution');
  }

  try {
    // Transition: REMEDIATION_TRIGGERED → REMEDIATION_RUNNING
    stateGraph.updateObjectiveStatus(
      objectiveId,
      'remediation_running',
      'execution',
      {
        plan_id: remediationPlan.plan_id,
        started_at: new Date().toISOString()
      }
    );

    // Execute through governed pipeline (Phase 9.7.3: Real Execution)
    const executionResult = await context.chatActionBridge.executeRemediationPlan(
      remediationPlan.plan_id,
      { objectiveId }
    );

    // Extract results
    const policyDecision = executionResult.policy_decision || null;
    const executionId = executionResult.execution_id || null;
    const verificationOutcome = executionResult.verification_result || null;
    const workflowOutcome = executionResult.workflow_outcome || null;

    // Determine objective state transitions based on outcome
    // State machine: REMEDIATION_RUNNING → VERIFICATION → RESTORED/FAILED
    let transitionMetadata = {
      execution_id: executionId,
      completed_at: new Date().toISOString()
    };

    // Handle approval required
    if (executionResult.status === 'approval_required') {
      // Remain in REMEDIATION_RUNNING until approved
      return {
        objective_id: objectiveId,
        objective_state: 'remediation_running',
        triggered_plan_id: remediationPlan.plan_id,
        execution_id: executionId,
        policy_decision: policyDecision,
        remediation_outcome: { success: false, pending_approval: true },
        verification_outcome: null,
        triggered: true,
        suppression_reason: null
      };
    }

    // Handle execution failure
    if (executionResult.status === 'failed') {
      stateGraph.updateObjectiveStatus(
        objectiveId,
        'failed',
        'execution',
        { ...transitionMetadata, execution_error: executionResult.error }
      );

      return {
        objective_id: objectiveId,
        objective_state: 'failed',
        triggered_plan_id: remediationPlan.plan_id,
        execution_id: executionId,
        policy_decision: policyDecision,
        remediation_outcome: { success: false, error: executionResult.error },
        verification_outcome: verificationOutcome,
        triggered: true,
        suppression_reason: null
      };
    }

    // Transition to VERIFICATION state
    stateGraph.updateObjectiveStatus(
      objectiveId,
      'verification',
      'execution',
      transitionMetadata
    );

    // Determine final state based on verification outcome
    let finalState;
    let finalReason;
    let finalMetadata = { ...transitionMetadata };

    if (workflowOutcome && workflowOutcome.objective_achieved) {
      // Success: VERIFICATION → RESTORED
      finalState = 'restored';
      finalReason = 'verification';
      finalMetadata.verification_result = 'success';
    } else if (verificationOutcome && !verificationOutcome.objective_achieved) {
      // Verification failed: VERIFICATION → FAILED
      finalState = 'failed';
      finalReason = 'verification';
      finalMetadata.verification_result = 'failed';
      finalMetadata.verification_summary = verificationOutcome.summary;
    } else {
      // Unknown outcome: VERIFICATION → FAILED
      finalState = 'failed';
      finalReason = 'execution';
      finalMetadata.error = 'unknown_outcome';
    }

    // Update objective to final state
    stateGraph.updateObjectiveStatus(
      objectiveId,
      finalState,
      finalReason,
      finalMetadata
    );

    return {
      objective_id: objectiveId,
      objective_state: finalState,
      triggered_plan_id: remediationPlan.plan_id,
      execution_id: executionId,
      policy_decision: policyDecision,
      remediation_outcome: workflowOutcome || { success: finalState === 'restored' },
      verification_outcome: verificationOutcome,
      triggered: true,
      suppression_reason: null
    };

  } catch (error) {
    // Execution threw: REMEDIATION_RUNNING → FAILED
    stateGraph.updateObjectiveStatus(
      objectiveId,
      'failed',
      'execution',
      {
        error: error.message,
        stack: error.stack,
        failed_at: new Date().toISOString()
      }
    );

    return {
      objective_id: objectiveId,
      objective_state: 'failed',
      triggered_plan_id: objective.remediation_plan,
      execution_id: null,
      policy_decision: null,
      remediation_outcome: { success: false, error: error.message },
      verification_outcome: null,
      triggered: false,
      suppression_reason: 'execution_exception'
    };
  }
}

/**
 * Batch trigger remediation for multiple objectives
 * 
 * @param {string[]} objectiveIds - Array of objective IDs
 * @param {Object} context - Execution context
 * @returns {Promise<RemediationTriggerResult[]>}
 */
async function triggerRemediationBatch(objectiveIds, context = {}) {
  const results = [];
  for (const objectiveId of objectiveIds) {
    try {
      const result = await triggerRemediation(objectiveId, context);
      results.push(result);
    } catch (error) {
      results.push({
        objective_id: objectiveId,
        objective_state: 'UNKNOWN',
        triggered_plan_id: null,
        execution_id: null,
        policy_decision: null,
        remediation_outcome: { success: false, error: error.message },
        verification_outcome: null,
        triggered: false,
        suppression_reason: 'trigger_exception'
      });
    }
  }
  return results;
}

module.exports = {
  triggerRemediation,
  triggerRemediationBatch,
  checkRemediationEligibility,
  isRemediating
};
