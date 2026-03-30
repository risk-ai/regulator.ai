/**
 * Phase 10.1d — Remediation Trigger Integration
 *
 * Gate-controlled remediation execution.
 *
 * Core invariants:
 * 1. No execution unless objective is in 'reconciling' status
 * 2. Generation must match admitted generation
 * 3. Execution success alone does NOT declare recovery
 * 4. Only verification may close reconciling → idle
 *
 * Architectural boundary:
 * > Gate admits → Trigger executes → Verification closes
 */
const { getStateGraph } = require('../state/state-graph');
const { ReconciliationStatus, TransitionReason, hasAttemptsRemaining } = require('./reconciliation-state-machine');
/**
 * Remediation trigger result
 * @typedef {Object} RemediationTriggerResult
 * @property {string} objective_id
 * @property {boolean} started - Whether execution started
 * @property {string|null} execution_id - Execution ledger ID (if started)
 * @property {string|null} rejection_reason - Why execution was rejected (if not started)
 * @property {Object|null} execution_result - Execution outcome
 * @property {Object|null} verification_result - Verification outcome
 * @property {string} final_status - Final reconciliation status
 * @property {number} generation - Reconciliation generation at completion
 */
/**
 * Check execution preconditions
 *
 * @param {Object} objective - Objective from State Graph
 * @param {number} admittedGeneration - Generation from gate admission
 * @param {Object} options - Additional options (safe_mode check)
 * @returns {{allowed: boolean, reason?: string}}
 */
function checkExecutionPreconditions(objective, admittedGeneration, options = {}) {
    // Precondition 1: Must be in reconciling status
    if (objective.reconciliation_status !== ReconciliationStatus.RECONCILING) {
        return {
            allowed: false,
            reason: `invalid_status_${objective.reconciliation_status}`
        };
    }
    // Precondition 2: Generation must match
    if (objective.reconciliation_generation !== admittedGeneration) {
        return {
            allowed: false,
            reason: 'generation_mismatch',
            metadata: {
                expected: admittedGeneration,
                actual: objective.reconciliation_generation
            }
        };
    }
    // Precondition 3: Not suppressed by manual hold
    if (objective.manual_hold) {
        return {
            allowed: false,
            reason: 'manual_hold'
        };
    }
    // Precondition 4: Not suppressed by safe mode (runtime check)
    if (options.global_safe_mode) {
        return {
            allowed: false,
            reason: 'safe_mode'
        };
    }
    return { allowed: true };
}
/**
 * Handle execution failure
 *
 * Transitions:
 * - If attempts remain: reconciling → cooldown
 * - If exhausted: reconciling → degraded
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} error - Error message
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
function handleExecutionFailure(stateGraph, objective, error, executionId) {
    const now = new Date().toISOString();
    // Phase 10.2: Load failure policy for breaker accounting
    const policy = objective.policy_ref ? stateGraph.getFailurePolicy(objective.policy_ref) : null;
    const { calculateCooldownDuration, shouldEnterDegraded } = require('./failure-policy-schema');
    // Phase 10.2: Update breaker counters
    const consecutiveFailures = (objective.consecutive_failures || 0) + 1;
    const totalFailures = (objective.total_failures || 0) + 1;
    // Phase 10.2: Check if degraded threshold reached
    const shouldDegrade = shouldEnterDegraded(policy, consecutiveFailures);
    if (shouldDegrade) {
        // Transition to degraded
        const updates = {
            reconciliation_status: ReconciliationStatus.DEGRADED,
            reconciliation_last_result: 'execution_failed',
            reconciliation_last_error: error,
            reconciliation_last_execution_id: executionId,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            last_failure_at: now,
            degraded_reason: `Consecutive failures reached threshold: ${consecutiveFailures}`,
            updated_at: now
        };
        stateGraph.updateObjective(objective.objective_id, updates);
        // Record reconciliation event
        stateGraph.recordObjectiveTransition(objective.objective_id, ReconciliationStatus.RECONCILING, ReconciliationStatus.DEGRADED, 'objective.reconciliation.degraded', {
            generation: objective.reconciliation_generation,
            attempt_count: objective.reconciliation_attempt_count,
            execution_id: executionId,
            error: error,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            degraded_threshold: policy?.degraded?.enter_after_consecutive_failures,
            failure_type: 'execution_failed'
        });
        return {
            status: ReconciliationStatus.DEGRADED,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            degraded_reason: updates.degraded_reason
        };
    }
    else {
        // Transition to cooldown
        // Phase 10.2: Calculate cooldown using policy
        const cooldownSeconds = calculateCooldownDuration(policy, consecutiveFailures);
        const cooldownUntil = new Date(Date.now() + (cooldownSeconds * 1000)).toISOString();
        const updates = {
            reconciliation_status: ReconciliationStatus.COOLDOWN,
            reconciliation_cooldown_until: cooldownUntil,
            reconciliation_last_result: 'execution_failed',
            reconciliation_last_error: error,
            reconciliation_last_execution_id: executionId,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            last_failure_at: now,
            updated_at: now
        };
        stateGraph.updateObjective(objective.objective_id, updates);
        // Record reconciliation event
        stateGraph.recordObjectiveTransition(objective.objective_id, ReconciliationStatus.RECONCILING, ReconciliationStatus.COOLDOWN, 'objective.reconciliation.cooldown_entered', {
            generation: objective.reconciliation_generation,
            attempt_count: objective.reconciliation_attempt_count,
            execution_id: executionId,
            error: error,
            cooldown_until: cooldownUntil,
            cooldown_seconds: cooldownSeconds,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            failure_type: 'execution_failed'
        });
        const attemptsRemaining = policy?.max_consecutive_failures
            ? (policy.max_consecutive_failures - consecutiveFailures)
            : null;
        return {
            status: ReconciliationStatus.COOLDOWN,
            cooldown_until: cooldownUntil,
            cooldown_seconds: cooldownSeconds,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            attempts_remaining: attemptsRemaining
        };
    }
}
/**
 * Handle verification failure
 *
 * Same transition logic as execution failure.
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} error - Error message
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
function handleVerificationFailure(stateGraph, objective, error, executionId) {
    const now = new Date().toISOString();
    // Phase 10.2: Load failure policy for breaker accounting
    const policy = objective.policy_ref ? stateGraph.getFailurePolicy(objective.policy_ref) : null;
    const { calculateCooldownDuration, shouldEnterDegraded } = require('./failure-policy-schema');
    // Phase 10.2: Update breaker counters
    const consecutiveFailures = (objective.consecutive_failures || 0) + 1;
    const totalFailures = (objective.total_failures || 0) + 1;
    // Phase 10.2: Check if degraded threshold reached
    const shouldDegrade = shouldEnterDegraded(policy, consecutiveFailures);
    if (shouldDegrade) {
        // Transition to degraded
        const updates = {
            reconciliation_status: ReconciliationStatus.DEGRADED,
            reconciliation_last_result: 'verification_failed',
            reconciliation_last_error: error,
            reconciliation_last_execution_id: executionId,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            last_failure_at: now,
            degraded_reason: `Consecutive failures reached threshold: ${consecutiveFailures}`,
            updated_at: now
        };
        stateGraph.updateObjective(objective.objective_id, updates);
        // Record reconciliation event
        stateGraph.recordObjectiveTransition(objective.objective_id, ReconciliationStatus.RECONCILING, ReconciliationStatus.DEGRADED, 'objective.reconciliation.degraded', {
            generation: objective.reconciliation_generation,
            attempt_count: objective.reconciliation_attempt_count,
            execution_id: executionId,
            error: error,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            degraded_threshold: policy?.degraded?.enter_after_consecutive_failures,
            failure_type: 'verification_failed'
        });
        return {
            status: ReconciliationStatus.DEGRADED,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            degraded_reason: updates.degraded_reason
        };
    }
    else {
        // Transition to cooldown
        // Phase 10.2: Calculate cooldown using policy
        const cooldownSeconds = calculateCooldownDuration(policy, consecutiveFailures);
        const cooldownUntil = new Date(Date.now() + (cooldownSeconds * 1000)).toISOString();
        const updates = {
            reconciliation_status: ReconciliationStatus.COOLDOWN,
            reconciliation_cooldown_until: cooldownUntil,
            reconciliation_last_result: 'verification_failed',
            reconciliation_last_error: error,
            reconciliation_last_execution_id: executionId,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            last_failure_at: now,
            updated_at: now
        };
        stateGraph.updateObjective(objective.objective_id, updates);
        // Record reconciliation event
        stateGraph.recordObjectiveTransition(objective.objective_id, ReconciliationStatus.RECONCILING, ReconciliationStatus.COOLDOWN, 'objective.reconciliation.cooldown_entered', {
            generation: objective.reconciliation_generation,
            attempt_count: objective.reconciliation_attempt_count,
            execution_id: executionId,
            error: error,
            cooldown_until: cooldownUntil,
            cooldown_seconds: cooldownSeconds,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            failure_type: 'verification_failed'
        });
        const attemptsRemaining = policy?.max_consecutive_failures
            ? (policy.max_consecutive_failures - consecutiveFailures)
            : null;
        return {
            status: ReconciliationStatus.COOLDOWN,
            cooldown_until: cooldownUntil,
            cooldown_seconds: cooldownSeconds,
            consecutive_failures: consecutiveFailures,
            total_failures: totalFailures,
            attempts_remaining: attemptsRemaining
        };
    }
}
/**
 * Handle verification success
 *
 * This is the ONLY automatic path from reconciling to idle.
 *
 * Transition: reconciling → idle
 *
 * @param {Object} stateGraph - State Graph instance
 * @param {Object} objective - Objective
 * @param {string} executionId - Execution ID
 * @returns {Object} Updated reconciliation status
 */
function handleVerificationSuccess(stateGraph, objective, executionId) {
    const now = new Date().toISOString();
    // Phase 10.2: Load failure policy for reset logic
    const policy = objective.policy_ref ? stateGraph.getFailurePolicy(objective.policy_ref) : null;
    const { shouldResetOnRecovery } = require('./failure-policy-schema');
    const resetCounters = shouldResetOnRecovery(policy);
    const updates = {
        reconciliation_status: ReconciliationStatus.IDLE,
        reconciliation_attempt_count: 0,
        reconciliation_started_at: null,
        reconciliation_cooldown_until: null,
        reconciliation_last_result: 'recovered',
        reconciliation_last_error: null,
        reconciliation_last_execution_id: executionId,
        reconciliation_last_verified_at: now,
        updated_at: now
    };
    // Phase 10.2: Reset breaker counters on verified recovery (if policy allows)
    if (resetCounters) {
        updates.consecutive_failures = 0;
        updates.degraded_reason = null;
    }
    stateGraph.updateObjective(objective.objective_id, updates);
    // Record reconciliation event
    stateGraph.recordObjectiveTransition(objective.objective_id, ReconciliationStatus.RECONCILING, ReconciliationStatus.IDLE, 'objective.reconciliation.recovered', {
        generation: objective.reconciliation_generation,
        execution_id: executionId,
        verified_at: updates.reconciliation_last_verified_at
    });
    return {
        status: ReconciliationStatus.IDLE,
        recovered: true
    };
}
/**
 * Execute remediation for admitted objective
 *
 * This is the gate-controlled execution path.
 *
 * @param {string} objectiveId - Objective ID
 * @param {number} admittedGeneration - Generation from gate admission
 * @param {Object} context - Execution context
 * @param {Object} context.chatActionBridge - Chat action bridge instance (for execution)
 * @param {boolean} context.global_safe_mode - Safe mode flag
 * @returns {Promise<RemediationTriggerResult>}
 */
async function executeAdmittedRemediation(objectiveId, admittedGeneration, context = {}) {
    const stateGraph = getStateGraph();
    await stateGraph.initialize();
    // Re-read objective (state may have changed since admission)
    const objective = stateGraph.getObjective(objectiveId);
    if (!objective) {
        return {
            objective_id: objectiveId,
            started: false,
            execution_id: null,
            rejection_reason: 'objective_not_found',
            execution_result: null,
            verification_result: null,
            final_status: null,
            generation: admittedGeneration
        };
    }
    // Check execution preconditions
    const preconditions = checkExecutionPreconditions(objective, admittedGeneration, {
        global_safe_mode: context.global_safe_mode || false
    });
    if (!preconditions.allowed) {
        return {
            objective_id: objectiveId,
            started: false,
            execution_id: null,
            rejection_reason: preconditions.reason,
            rejection_metadata: preconditions.metadata,
            execution_result: null,
            verification_result: null,
            final_status: objective.reconciliation_status,
            generation: objective.reconciliation_generation
        };
    }
    // Load remediation plan
    const plan = stateGraph.getPlan(objective.remediation_plan);
    if (!plan) {
        // Plan not found → degraded
        const updates = {
            reconciliation_status: ReconciliationStatus.DEGRADED,
            reconciliation_last_result: 'plan_not_found',
            reconciliation_last_error: `Plan not found: ${objective.remediation_plan}`,
            updated_at: new Date().toISOString()
        };
        stateGraph.updateObjective(objectiveId, updates);
        return {
            objective_id: objectiveId,
            started: false,
            execution_id: null,
            rejection_reason: 'plan_not_found',
            execution_result: null,
            verification_result: null,
            final_status: ReconciliationStatus.DEGRADED,
            generation: objective.reconciliation_generation
        };
    }
    // Execute through chat action bridge
    if (!context.chatActionBridge) {
        throw new Error('chatActionBridge required in context');
    }
    let executionId = null;
    let executionResult = null;
    let verificationResult = null;
    try {
        // Phase 10.3: Create execution lease
        const { generateAttemptId } = require('./execution-watchdog');
        const { createDefaultPolicy } = require('./failure-policy-schema');
        const policy = createDefaultPolicy(); // TODO: Load from objective.policy_ref
        const attemptId = generateAttemptId();
        const now = new Date().toISOString();
        const deadline = new Date(Date.now() + (policy.execution.timeout_seconds * 1000)).toISOString();
        // Update execution start metadata + execution lease fields
        stateGraph.updateObjective(objectiveId, {
            reconciliation_last_result: 'execution_started',
            active_attempt_id: attemptId,
            execution_started_at: now,
            execution_deadline_at: deadline,
            cancel_requested_at: null,
            execution_terminated_at: null,
            termination_result: 'none',
            updated_at: now
        });
        // Record execution started ledger event (Phase 10.3)
        await stateGraph.appendLedgerEvent({
            execution_id: executionId || attemptId,
            plan_id: plan.plan_id,
            event_type: 'objective.execution.started',
            stage: 'execution',
            objective: objectiveId,
            target_type: objective.target_type,
            target_id: objective.target_id,
            event_timestamp: now,
            payload_json: JSON.stringify({
                objective_id: objectiveId,
                generation: objective.reconciliation_generation,
                attempt_id: attemptId,
                started_at: now,
                deadline_at: deadline,
                timeout_seconds: policy.execution.timeout_seconds,
                kill_strategy: policy.execution.kill_strategy,
                grace_period_seconds: policy.execution.grace_period_seconds,
                policy_id: objective.policy_ref || 'default-service-remediation'
            })
        });
        // Record reconciliation started event
        stateGraph.recordObjectiveTransition(objectiveId, ReconciliationStatus.RECONCILING, ReconciliationStatus.RECONCILING, 'objective.reconciliation.started', {
            generation: objective.reconciliation_generation,
            attempt_count: objective.reconciliation_attempt_count,
            plan_id: plan.plan_id,
            attempt_id: attemptId
        });
        // Execute remediation plan
        const result = await context.chatActionBridge.executeRemediationPlan(plan.plan_id, { objectiveId, attemptId, generation: objective.reconciliation_generation });
        executionId = result.execution_id || attemptId;
        executionResult = result;
        // Phase 10.3: Check for stale completion
        const currentObjective = stateGraph.getObjective(objectiveId);
        const isStale = (currentObjective.reconciliation_generation !== objective.reconciliation_generation ||
            currentObjective.active_attempt_id !== attemptId ||
            currentObjective.last_terminal_reason === 'timed_out');
        if (isStale) {
            // Result arrived after timeout or generation change - ignore
            await stateGraph.appendLedgerEvent({
                execution_id: executionId,
                plan_id: plan.plan_id,
                event_type: 'objective.execution.result_ignored_stale',
                stage: 'execution',
                objective: objectiveId,
                target_type: objective.target_type,
                target_id: objective.target_id,
                event_timestamp: new Date().toISOString(),
                payload_json: JSON.stringify({
                    objective_id: objectiveId,
                    received_generation: objective.reconciliation_generation,
                    current_generation: currentObjective.reconciliation_generation,
                    received_attempt_id: attemptId,
                    current_attempt_id: currentObjective.active_attempt_id,
                    ignored_at: new Date().toISOString(),
                    reason: 'generation_or_attempt_mismatch'
                })
            });
            return {
                objective_id: objectiveId,
                started: true,
                execution_id: executionId,
                rejection_reason: 'stale_completion',
                execution_result: executionResult,
                verification_result: null,
                final_status: currentObjective.reconciliation_status,
                generation: currentObjective.reconciliation_generation
            };
        }
        // Update execution result metadata
        stateGraph.updateObjective(objectiveId, {
            reconciliation_last_execution_id: executionId,
            execution_terminated_at: new Date().toISOString(),
            last_terminal_reason: 'completed',
            updated_at: new Date().toISOString()
        });
        // Handle execution failure
        if (result.status === 'failed' || !result.success) {
            const error = result.error || 'execution_failed';
            const failureStatus = handleExecutionFailure(stateGraph, objective, error, executionId);
            // Phase 10.3: Clear active attempt fields
            const { clearActiveAttemptFields } = require('./execution-watchdog');
            await clearActiveAttemptFields(objectiveId);
            return {
                objective_id: objectiveId,
                started: true,
                execution_id: executionId,
                rejection_reason: null,
                execution_result: executionResult,
                verification_result: null,
                final_status: failureStatus.status,
                generation: objective.reconciliation_generation,
                ...failureStatus
            };
        }
        // Execution succeeded, update metadata (remain reconciling)
        stateGraph.updateObjective(objectiveId, {
            reconciliation_last_result: 'execution_succeeded',
            updated_at: new Date().toISOString()
        });
        // Proceed to verification
        verificationResult = result.verification_result || null;
        // Handle verification failure
        if (!verificationResult || !verificationResult.objective_achieved) {
            const error = verificationResult?.summary || 'verification_failed';
            const failureStatus = handleVerificationFailure(stateGraph, objective, error, executionId);
            // Phase 10.3: Clear active attempt fields
            const { clearActiveAttemptFields } = require('./execution-watchdog');
            await clearActiveAttemptFields(objectiveId);
            return {
                objective_id: objectiveId,
                started: true,
                execution_id: executionId,
                rejection_reason: null,
                execution_result: executionResult,
                verification_result: verificationResult,
                final_status: failureStatus.status,
                generation: objective.reconciliation_generation,
                ...failureStatus
            };
        }
        // Verification succeeded → close to idle
        const successStatus = handleVerificationSuccess(stateGraph, objective, executionId);
        // Phase 10.3: Clear active attempt fields
        const { clearActiveAttemptFields } = require('./execution-watchdog');
        await clearActiveAttemptFields(objectiveId);
        return {
            objective_id: objectiveId,
            started: true,
            execution_id: executionId,
            rejection_reason: null,
            execution_result: executionResult,
            verification_result: verificationResult,
            final_status: successStatus.status,
            generation: objective.reconciliation_generation,
            ...successStatus
        };
    }
    catch (error) {
        // Exception during execution
        const failureStatus = handleExecutionFailure(stateGraph, objective, error.message, executionId);
        // Phase 10.3: Clear active attempt fields
        const { clearActiveAttemptFields } = require('./execution-watchdog');
        await clearActiveAttemptFields(objectiveId);
        return {
            objective_id: objectiveId,
            started: true,
            execution_id: executionId,
            rejection_reason: null,
            execution_result: { error: error.message },
            verification_result: null,
            final_status: failureStatus.status,
            generation: objective.reconciliation_generation,
            ...failureStatus
        };
    }
}
module.exports = {
    executeAdmittedRemediation,
    checkExecutionPreconditions,
    handleExecutionFailure,
    handleVerificationFailure,
    handleVerificationSuccess
};
//# sourceMappingURL=remediation-trigger-integrated.js.map