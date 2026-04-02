/**
 * Reconciliation Gate (Phase 10.1c)
 *
 * Admission control for objective reconciliation.
 *
 * Core responsibility:
 *   Decide whether an objective may start reconciliation.
 *   Enforce single-flight reconciliation.
 *   Apply atomic state transitions.
 *   Track skip reasons.
 *
 * Architectural boundary:
 *   Evaluator detects drift → Gate decides admission → Executor performs action
 */
const { ReconciliationStatus, TransitionReason, isEligibleForReconciliation, canTransition, applyTransition, hasAttemptsRemaining } = require('./reconciliation-state-machine');
/**
 * Gate Decision Result
 *
 * @typedef {Object} GateDecision
 * @property {boolean} admitted - Whether reconciliation is admitted
 * @property {string} reason - Reason for admission or skip
 * @property {number|null} generation - Reconciliation generation (if admitted)
 * @property {Object|null} updates - State updates to apply (if admitted)
 * @property {Object|null} metadata - Additional context
 */
/**
 * Reconciliation Gate
 *
 * Stateless service for admission control.
 * State mutations applied via StateGraph.
 */
class ReconciliationGate {
    constructor(stateGraph, options = {}) {
        this.stateGraph = stateGraph;
        this.options = {
            global_safe_mode: false,
            ...options
        };
    }
    /**
     * Request reconciliation admission for an objective
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Admission context (drift_reason, intent_id, etc.)
     * @returns {GateDecision} Admission decision
     */
    requestAdmission(objectiveId, context = {}) {
        // HYBRID ENFORCEMENT (Phase 11): Log if no intent context
        if (!context.intent_id) {
            console.warn('[DIRECT_ACTION_BYPASS] action=requestAdmission objective=' + objectiveId + ' source=internal migration_required=true');
            console.warn('[DIRECT_ACTION_BYPASS] Direct reconciliation admission without intent context. Use IntentGateway.submitIntent() instead.');
        }
        // SAFE MODE CHECK (highest priority)
        const safeModeStatus = this.stateGraph.getSafeModeStatus();
        if (safeModeStatus.active) {
            // Record skip event
            this.stateGraph.appendLedgerEvent({
                execution_id: `gate-${objectiveId}-${Date.now()}`,
                event_type: 'objective.reconciliation.skipped',
                stage: 'policy',
                actor_type: 'system',
                actor_id: 'reconciliation-gate',
                event_timestamp: new Date().toISOString(),
                objective: objectiveId,
                payload_json: {
                    skip_reason: 'safe_mode',
                    safe_mode_reason: safeModeStatus.reason,
                    safe_mode_entered_by: safeModeStatus.entered_by,
                    safe_mode_entered_at: safeModeStatus.entered_at
                }
            });
            return {
                admitted: false,
                reason: 'safe_mode',
                generation: null,
                updates: null,
                metadata: {
                    objective_id: objectiveId,
                    safe_mode_reason: safeModeStatus.reason,
                    safe_mode_entered_by: safeModeStatus.entered_by,
                    safe_mode_entered_at: safeModeStatus.entered_at
                }
            };
        }
        // Load objective
        const objective = this.stateGraph.getObjective(objectiveId);
        if (!objective) {
            return {
                admitted: false,
                reason: 'objective_not_found',
                generation: null,
                updates: null,
                metadata: { objective_id: objectiveId }
            };
        }
        // Check eligibility
        const eligibility = isEligibleForReconciliation(objective, {
            global_safe_mode: this.options.global_safe_mode,
            current_time: context.current_time
        });
        if (!eligibility.eligible) {
            return {
                admitted: false,
                reason: eligibility.reason,
                generation: objective.reconciliation_generation,
                updates: null,
                metadata: {
                    objective_id: objectiveId,
                    current_status: objective.reconciliation_status,
                    attempt_count: objective.reconciliation_attempt_count,
                    cooldown_until: objective.reconciliation_cooldown_until
                }
            };
        }
        // Determine transition reason
        const currentStatus = objective.reconciliation_status;
        let transitionReason;
        if (currentStatus === ReconciliationStatus.IDLE) {
            transitionReason = TransitionReason.DRIFT_DETECTED;
        }
        else if (currentStatus === ReconciliationStatus.COOLDOWN) {
            transitionReason = TransitionReason.COOLDOWN_EXPIRED;
        }
        else {
            // Should not reach here if eligibility check is correct
            return {
                admitted: false,
                reason: 'invalid_status',
                generation: objective.reconciliation_generation,
                updates: null,
                metadata: { current_status: currentStatus }
            };
        }
        // Validate transition is allowed
        if (!canTransition(currentStatus, ReconciliationStatus.RECONCILING, transitionReason)) {
            return {
                admitted: false,
                reason: 'invalid_transition',
                generation: objective.reconciliation_generation,
                updates: null,
                metadata: {
                    from: currentStatus,
                    to: ReconciliationStatus.RECONCILING,
                    reason: transitionReason
                }
            };
        }
        // Phase 10.2: Load and evaluate failure policy
        const policy = this._loadPolicy(objective);
        const policyEvaluation = this._evaluatePolicy(objective, policy, context);
        if (!policyEvaluation.allowed) {
            return {
                admitted: false,
                reason: policyEvaluation.reason,
                generation: objective.reconciliation_generation,
                updates: null,
                metadata: {
                    objective_id: objectiveId,
                    policy_ref: objective.policy_ref,
                    policy_reason: policyEvaluation.reason,
                    ...policyEvaluation.metadata
                }
            };
        }
        // Prepare state updates
        const updates = applyTransition(objective, ReconciliationStatus.RECONCILING, transitionReason, context);
        // Increment attempt count (gate responsibility)
        updates.reconciliation_attempt_count = (objective.reconciliation_attempt_count || 0) + 1;
        const newGeneration = updates.reconciliation_generation;
        return {
            admitted: true,
            reason: transitionReason,
            generation: newGeneration,
            updates: updates,
            metadata: {
                objective_id: objectiveId,
                previous_status: currentStatus,
                new_status: ReconciliationStatus.RECONCILING,
                attempt_count: updates.reconciliation_attempt_count,
                generation: newGeneration
            }
        };
    }
    /**
     * Admit reconciliation with atomic state update
     *
     * This is the single-flight enforcement point.
     * Uses compare-and-swap pattern on reconciliation_status.
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Admission context
     * @returns {Object} { admitted: boolean, generation: number|null, reason: string }
     */
    admitAndTransition(objectiveId, context = {}) {
        // Request admission (pre-flight check)
        const decision = this.requestAdmission(objectiveId, context);
        if (!decision.admitted) {
            return {
                admitted: false,
                generation: null,
                reason: decision.reason,
                metadata: decision.metadata
            };
        }
        // Load objective again for atomic update
        const objective = this.stateGraph.getObjective(objectiveId);
        if (!objective) {
            return {
                admitted: false,
                generation: null,
                reason: 'objective_disappeared',
                metadata: { objective_id: objectiveId }
            };
        }
        // Compare-and-swap: only update if status hasn't changed
        const currentStatus = objective.reconciliation_status;
        const expectedStatus = decision.metadata.previous_status;
        if (currentStatus !== expectedStatus) {
            // Status changed between check and update (race condition)
            return {
                admitted: false,
                generation: null,
                reason: 'status_changed',
                metadata: {
                    expected: expectedStatus,
                    actual: currentStatus,
                    objective_id: objectiveId
                }
            };
        }
        // Apply updates atomically
        try {
            this.stateGraph.updateObjective(objectiveId, decision.updates);
            // Record reconciliation event
            this.stateGraph.recordObjectiveTransition(objectiveId, expectedStatus, ReconciliationStatus.RECONCILING, 'objective.reconciliation.requested', {
                generation: decision.generation,
                attempt_count: decision.updates.reconciliation_attempt_count,
                admission_reason: decision.reason,
                drift_reason: context.drift_reason || null
            });
            return {
                admitted: true,
                generation: decision.generation,
                reason: decision.reason,
                metadata: {
                    objective_id: objectiveId,
                    new_status: ReconciliationStatus.RECONCILING,
                    attempt_count: decision.updates.reconciliation_attempt_count,
                    generation: decision.generation
                }
            };
        }
        catch (err) {
            return {
                admitted: false,
                generation: null,
                reason: 'update_failed',
                metadata: {
                    error: err.message,
                    objective_id: objectiveId
                }
            };
        }
    }
    /**
     * Batch admission check (without state mutation)
     *
     * Used by evaluator to determine which objectives need reconciliation.
     *
     * @param {string[]} objectiveIds - Array of objective IDs
     * @param {Object} context - Shared context
     * @returns {Object[]} Array of decisions
     */
    batchCheckEligibility(objectiveIds, context = {}) {
        const decisions = [];
        for (const objectiveId of objectiveIds) {
            const decision = this.requestAdmission(objectiveId, context);
            decisions.push({
                objective_id: objectiveId,
                ...decision
            });
        }
        return decisions;
    }
    /**
     * Get gate status summary
     *
     * @returns {Object} Current gate configuration
     */
    getStatus() {
        return {
            global_safe_mode: this.options.global_safe_mode,
            active: !this.options.global_safe_mode
        };
    }
    /**
     * Enable global safe mode
     *
     * Blocks all new reconciliation admissions.
     */
    enableSafeMode(reason = 'operator_action') {
        this.options.global_safe_mode = true;
        // Record safe mode event for all active objectives
        const activeObjectives = this.stateGraph.listObjectives({ is_enabled: true });
        for (const objective of activeObjectives) {
            this.stateGraph.recordObjectiveTransition(objective.objective_id, objective.reconciliation_status, objective.reconciliation_status, 'objective.reconciliation.safe_mode_entered', {
                reason: reason,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Disable global safe mode
     *
     * Allows reconciliation admissions.
     */
    disableSafeMode(reason = 'operator_action') {
        this.options.global_safe_mode = false;
        // Record safe mode released event for all active objectives
        const activeObjectives = this.stateGraph.listObjectives({ is_enabled: true });
        for (const objective of activeObjectives) {
            this.stateGraph.recordObjectiveTransition(objective.objective_id, objective.reconciliation_status, objective.reconciliation_status, 'objective.reconciliation.safe_mode_released', {
                reason: reason,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Check if objective can be admitted (read-only)
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Context
     * @returns {Object} { eligible: boolean, reason: string }
     */
    checkEligibility(objectiveId, context = {}) {
        const objective = this.stateGraph.getObjective(objectiveId);
        if (!objective) {
            return { eligible: false, reason: 'objective_not_found' };
        }
        const eligibility = isEligibleForReconciliation(objective, {
            global_safe_mode: this.options.global_safe_mode,
            current_time: context.current_time
        });
        return eligibility;
    }
    /**
     * Manually reset objective to idle state
     *
     * Operator override for degraded or stuck objectives.
     *
     * @param {string} objectiveId - Objective ID
     * @param {Object} context - Reset context (reason, operator)
     * @returns {Object} { success: boolean, message: string }
     */
    manualReset(objectiveId, context = {}) {
        const objective = this.stateGraph.getObjective(objectiveId);
        if (!objective) {
            return {
                success: false,
                message: 'objective_not_found'
            };
        }
        const currentStatus = objective.reconciliation_status;
        const now = new Date().toISOString();
        // Phase 10.2: Check if policy allows reset
        const policy = this._loadPolicy(objective);
        const { shouldResetOnManualReset } = require('./failure-policy-schema');
        const resetCounters = shouldResetOnManualReset(policy);
        // Reset to idle
        const updates = {
            reconciliation_status: ReconciliationStatus.IDLE,
            reconciliation_attempt_count: 0,
            reconciliation_started_at: null,
            reconciliation_cooldown_until: null,
            reconciliation_last_result: 'manual_reset',
            reconciliation_last_error: null,
            updated_at: now
        };
        // Phase 10.2: Reset breaker counters (if policy allows)
        if (resetCounters) {
            updates.consecutive_failures = 0;
            updates.degraded_reason = null;
            // Note: total_failures and total_attempts are NOT reset (preserve history)
        }
        this.stateGraph.updateObjective(objectiveId, updates);
        // Record manual reset event
        this.stateGraph.recordObjectiveTransition(objectiveId, currentStatus, ReconciliationStatus.IDLE, 'objective.reconciliation.manual_reset', {
            previous_status: currentStatus,
            operator: context.operator || 'unknown',
            reason: context.reason || 'operator_override',
            generation: objective.reconciliation_generation
        });
        return {
            success: true,
            message: 'objective_reset_to_idle',
            previous_status: currentStatus
        };
    }
    // ============================================================
    // POLICY EVALUATION (Phase 10.2)
    // ============================================================
    /**
     * Load failure policy for objective
     */
    _loadPolicy(objective) {
        if (!objective.policy_ref) {
            // No policy reference, use permissive defaults
            return null;
        }
        const policy = this.stateGraph.getFailurePolicy(objective.policy_ref);
        if (!policy) {
            // Policy not found, log warning but allow (fail open for missing policy)
            console.warn(`[ReconciliationGate] Policy not found: ${objective.policy_ref}`);
            return null;
        }
        return policy;
    }
    /**
     * Evaluate failure policy against objective state
     *
     * Returns: { allowed: boolean, reason: string, metadata: object }
     */
    _evaluatePolicy(objective, policy, context = {}) {
        if (!policy) {
            // No policy = always allow (permissive default)
            return { allowed: true, reason: 'no_policy', metadata: {} };
        }
        console.log(`[DEBUG] _evaluatePolicy: obj=${objective.objective_id}, consecutive_failures=${objective.consecutive_failures}, max_consecutive=${policy.max_consecutive_failures}`);
        const { calculateCooldownDuration, shouldEnterDegraded } = require('./failure-policy-schema');
        // Check 1: Max consecutive failures threshold
        if (policy.max_consecutive_failures !== undefined && policy.max_consecutive_failures !== null) {
            if (objective.consecutive_failures >= policy.max_consecutive_failures) {
                // Should be in degraded state (safety check)
                if (objective.reconciliation_status !== ReconciliationStatus.DEGRADED) {
                    console.warn(`[ReconciliationGate] Objective ${objective.objective_id} has ${objective.consecutive_failures} ` +
                        `consecutive failures (>= ${policy.max_consecutive_failures}) but not in degraded state`);
                }
                return {
                    allowed: false,
                    reason: 'policy_max_failures_reached',
                    metadata: {
                        consecutive_failures: objective.consecutive_failures,
                        max_allowed: policy.max_consecutive_failures
                    }
                };
            }
        }
        // Check 2: Cooldown window
        if (objective.reconciliation_cooldown_until) {
            const now = context.current_time || new Date().toISOString();
            if (now < objective.reconciliation_cooldown_until) {
                const remainingMs = new Date(objective.reconciliation_cooldown_until) - new Date(now);
                return {
                    allowed: false,
                    reason: 'policy_cooldown_active',
                    metadata: {
                        cooldown_until: objective.reconciliation_cooldown_until,
                        remaining_seconds: Math.ceil(remainingMs / 1000)
                    }
                };
            }
        }
        // Check 3: Degraded threshold (predictive check)
        if (shouldEnterDegraded(policy, objective.consecutive_failures + 1)) {
            // Next failure would trigger degraded
            // This is informational only - we still allow the attempt
            // Degraded state will be applied by breaker accounting after failure
            return {
                allowed: true,
                reason: 'policy_last_attempt_before_degraded',
                metadata: {
                    consecutive_failures: objective.consecutive_failures,
                    degraded_threshold: policy.degraded?.enter_after_consecutive_failures,
                    warning: 'next_failure_triggers_degraded'
                }
            };
        }
        // Policy allows admission
        return {
            allowed: true,
            reason: 'policy_approved',
            metadata: {
                policy_ref: policy.policy_id,
                consecutive_failures: objective.consecutive_failures,
                attempts_remaining: policy.max_consecutive_failures
                    ? (policy.max_consecutive_failures - objective.consecutive_failures)
                    : null
            }
        };
    }
}
/**
 * Create reconciliation gate instance
 *
 * @param {Object} stateGraph - State graph instance
 * @param {Object} options - Gate options
 * @returns {ReconciliationGate} Gate instance
 */
function createReconciliationGate(stateGraph, options = {}) {
    return new ReconciliationGate(stateGraph, options);
}
module.exports = {
    ReconciliationGate,
    createReconciliationGate
};
//# sourceMappingURL=reconciliation-gate.js.map