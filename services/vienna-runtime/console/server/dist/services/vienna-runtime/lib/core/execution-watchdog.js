/**
 * Execution Watchdog
 * Phase 10.3 - Execution Timeouts
 *
 * Enforces time-bounded execution authority.
 * Scans active execution leases and terminates expired attempts.
 *
 * Core invariant:
 * > Admission grants bounded authority in time.
 */
const { getStateGraph } = require('../state/state-graph');
const { calculateCooldownDuration, shouldEnterDegraded } = require('./failure-policy-schema');
/**
 * Watchdog service state
 */
let watchdogInterval = null;
let isRunning = false;
/**
 * Generate unique attempt ID
 */
function generateAttemptId() {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Request cooperative cancellation
 *
 * For Phase 10.3, this is a marker only. Future phases may
 * integrate with process.kill(SIGTERM) or worker cancellation.
 */
function requestCooperativeCancel(attemptId) {
    console.log(`[Watchdog] Requesting cooperative cancel for attempt ${attemptId}`);
    // Phase 10.3: marker only, no actual process termination
    return { requested: true };
}
/**
 * Force terminate execution
 *
 * For Phase 10.3, this is a marker. Future phases may integrate
 * with process.kill(SIGKILL) or worker force-stop.
 */
function forceTerminateAttempt(attemptId) {
    console.log(`[Watchdog] Force terminating attempt ${attemptId}`);
    // Phase 10.3: marker only, return success
    return 'forced_kill_succeeded';
}
/**
 * Load execution policy for objective
 */
async function loadExecutionPolicy(policyRef) {
    const stateGraph = getStateGraph();
    // For Phase 10.3, use default policy
    // Future: load from policies table
    const { createDefaultPolicy } = require('./failure-policy-schema');
    return createDefaultPolicy();
}
/**
 * Apply failed attempt accounting
 *
 * Increments failure counters and determines transition.
 */
async function applyFailedAttemptAccounting(objectiveId, generation, failureReason) {
    const stateGraph = getStateGraph();
    const objective = stateGraph.getObjective(objectiveId);
    if (!objective) {
        throw new Error(`Objective not found: ${objectiveId}`);
    }
    const policy = await loadExecutionPolicy(objective.policy_ref);
    const now = new Date().toISOString();
    const consecutiveFailures = objective.consecutive_failures + 1;
    const totalFailures = objective.total_failures + 1;
    // Check if degraded threshold reached
    const shouldDegrade = shouldEnterDegraded(policy, consecutiveFailures);
    // Update failure counters (field updates only, no status changes)
    const fieldUpdates = {
        consecutive_failures: consecutiveFailures,
        total_failures: totalFailures,
        last_failure_at: now
    };
    // Record history
    await stateGraph.recordObjectiveTransition(objectiveId, objective.reconciliation_status, shouldDegrade ? 'degraded' : 'cooldown', shouldDegrade ? 'attempts_exhausted' : 'failed_attempt', {
        generation,
        failure_reason: failureReason,
        consecutive_failures: consecutiveFailures,
        total_failures: totalFailures,
        policy_id: objective.policy_ref
    });
    // Emit ledger event
    if (shouldDegrade) {
        await stateGraph.appendLedgerEvent({
            execution_id: objective.reconciliation_last_execution_id || `unknown-${Date.now()}`,
            plan_id: null,
            event_type: 'objective.reconciliation.degraded',
            stage: 'outcome',
            objective: objective.objective_id,
            target_type: objective.target_type,
            target_id: objective.target_id,
            event_timestamp: now,
            payload_json: JSON.stringify({
                failure_reason: failureReason,
                attempt_id: objective.active_attempt_id,
                consecutive_failures: consecutiveFailures,
                degraded_reason: 'max_consecutive_failures_reached',
                policy_id: objective.policy_ref
            })
        });
        fieldUpdates.degraded_reason = 'max_consecutive_failures_reached';
    }
    else {
        // Calculate cooldown
        const cooldownSeconds = calculateCooldownDuration(policy, consecutiveFailures);
        const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
        await stateGraph.appendLedgerEvent({
            execution_id: objective.reconciliation_last_execution_id || `unknown-${Date.now()}`,
            plan_id: null,
            event_type: 'objective.reconciliation.cooldown_entered',
            stage: 'outcome',
            objective: objective.objective_id,
            target_type: objective.target_type,
            target_id: objective.target_id,
            event_timestamp: now,
            payload_json: JSON.stringify({
                failure_reason: failureReason,
                attempt_id: objective.active_attempt_id,
                consecutive_failures: consecutiveFailures,
                cooldown_until: cooldownUntil,
                policy_id: objective.policy_ref
            })
        });
        fieldUpdates.reconciliation_cooldown_until = cooldownUntil;
    }
    // Set reconciliation_status (not a state machine transition)
    fieldUpdates.reconciliation_status = shouldDegrade ? 'degraded' : 'cooldown';
    // Apply all field updates
    await stateGraph.updateObjective(objectiveId, fieldUpdates);
}
/**
 * Clear active attempt fields
 */
async function clearActiveAttemptFields(objectiveId) {
    const stateGraph = getStateGraph();
    await stateGraph.updateObjective(objectiveId, {
        active_attempt_id: null,
        execution_started_at: null,
        execution_deadline_at: null,
        cancel_requested_at: null
    });
}
/**
 * Handle expired execution lease
 */
async function handleExpiredLease(objective, now) {
    const policy = await loadExecutionPolicy(objective.policy_ref);
    const stateGraph = getStateGraph();
    // Stage 1: Cooperative cancellation (if not already requested)
    if (!objective.cancel_requested_at && policy.execution.kill_strategy === 'cooperative_then_forced') {
        requestCooperativeCancel(objective.active_attempt_id);
        await stateGraph.updateObjective(objective.objective_id, {
            cancel_requested_at: now
        });
        await stateGraph.appendLedgerEvent({
            execution_id: objective.reconciliation_last_execution_id || objective.active_attempt_id,
            plan_id: null,
            event_type: 'objective.execution.cancel_requested',
            stage: 'execution',
            objective: objective.objective_id,
            target_type: objective.target_type,
            target_id: objective.target_id,
            event_timestamp: now,
            payload_json: JSON.stringify({
                objective_id: objective.objective_id,
                generation: objective.reconciliation_generation,
                attempt_id: objective.active_attempt_id,
                cancel_requested_at: now,
                deadline_at: objective.execution_deadline_at,
                policy_id: objective.policy_ref
            })
        });
        console.log(`[Watchdog] Cooperative cancel requested for ${objective.objective_id}`);
        return;
    }
    // Stage 2: Check grace period for cooperative strategy
    if (policy.execution.kill_strategy === 'cooperative_then_forced' && objective.cancel_requested_at) {
        const cancelAge = (new Date(now).getTime() - new Date(objective.cancel_requested_at).getTime()) / 1000;
        if (cancelAge < policy.execution.grace_period_seconds) {
            console.log(`[Watchdog] Grace period active for ${objective.objective_id} (${cancelAge.toFixed(1)}s / ${policy.execution.grace_period_seconds}s)`);
            return;
        }
    }
    // Stage 3: Force termination
    const terminationResult = forceTerminateAttempt(objective.active_attempt_id);
    const timedOutAt = now;
    await stateGraph.updateObjective(objective.objective_id, {
        execution_terminated_at: timedOutAt,
        last_timeout_at: timedOutAt,
        last_terminal_reason: 'timed_out',
        termination_result: terminationResult
    });
    // Emit timeout events
    if (terminationResult === 'forced_kill_succeeded') {
        await stateGraph.appendLedgerEvent({
            execution_id: objective.reconciliation_last_execution_id || objective.active_attempt_id,
            plan_id: null,
            event_type: 'objective.execution.forced_terminated',
            stage: 'execution',
            objective: objective.objective_id,
            target_type: objective.target_type,
            target_id: objective.target_id,
            event_timestamp: timedOutAt,
            payload_json: JSON.stringify({
                objective_id: objective.objective_id,
                generation: objective.reconciliation_generation,
                attempt_id: objective.active_attempt_id,
                forced_terminated_at: timedOutAt,
                termination_result: terminationResult,
                policy_id: objective.policy_ref
            })
        });
    }
    await stateGraph.appendLedgerEvent({
        execution_id: objective.reconciliation_last_execution_id || objective.active_attempt_id,
        plan_id: null,
        event_type: 'objective.execution.timed_out',
        stage: 'execution',
        objective: objective.objective_id,
        target_type: objective.target_type,
        target_id: objective.target_id,
        event_timestamp: timedOutAt,
        payload_json: JSON.stringify({
            objective_id: objective.objective_id,
            generation: objective.reconciliation_generation,
            attempt_id: objective.active_attempt_id,
            started_at: objective.execution_started_at,
            deadline_at: objective.execution_deadline_at,
            timed_out_at: timedOutAt,
            termination_result: terminationResult,
            policy_id: objective.policy_ref
        })
    });
    console.log(`[Watchdog] Execution timed out for ${objective.objective_id}`);
    // Apply failure accounting
    await applyFailedAttemptAccounting(objective.objective_id, objective.reconciliation_generation, 'timeout');
    // Clear active attempt fields
    await clearActiveAttemptFields(objective.objective_id);
}
/**
 * Watchdog tick - scan and enforce deadlines
 */
async function watchdogTick() {
    const now = new Date().toISOString();
    const stateGraph = getStateGraph();
    try {
        // Find objectives with active attempts
        const objectives = stateGraph.listObjectives({
            is_enabled: 1,
            reconciliation_status: 'reconciling'
        });
        for (const objective of objectives) {
            // Skip if no active attempt
            if (!objective.active_attempt_id) {
                continue;
            }
            // Skip if no deadline
            if (!objective.execution_deadline_at) {
                continue;
            }
            // Check if deadline exceeded
            if (now < objective.execution_deadline_at) {
                continue;
            }
            console.log(`[Watchdog] Deadline exceeded for ${objective.objective_id}`);
            await handleExpiredLease(objective, now);
        }
    }
    catch (error) {
        console.error('[Watchdog] Error during tick:', error);
    }
}
/**
 * Startup sweep - terminalize expired persisted attempts
 */
async function startupSweep() {
    const now = new Date().toISOString();
    const stateGraph = getStateGraph();
    console.log('[Watchdog] Running startup sweep for expired attempts...');
    try {
        const objectives = stateGraph.listObjectives({
            is_enabled: 1,
            reconciliation_status: 'reconciling'
        });
        let expiredCount = 0;
        for (const objective of objectives) {
            if (!objective.active_attempt_id || !objective.execution_deadline_at) {
                continue;
            }
            if (now >= objective.execution_deadline_at) {
                console.log(`[Watchdog] Startup: Found expired attempt for ${objective.objective_id}`);
                await stateGraph.appendLedgerEvent({
                    execution_id: objective.reconciliation_last_execution_id || objective.active_attempt_id,
                    plan_id: null,
                    event_type: 'objective.execution.startup_expired_detected',
                    stage: 'execution',
                    objective: objective.objective_id,
                    target_type: objective.target_type,
                    target_id: objective.target_id,
                    event_timestamp: now,
                    payload_json: JSON.stringify({
                        objective_id: objective.objective_id,
                        generation: objective.reconciliation_generation,
                        attempt_id: objective.active_attempt_id,
                        detected_at: now,
                        deadline_at: objective.execution_deadline_at
                    })
                });
                await handleExpiredLease(objective, now);
                expiredCount++;
            }
        }
        console.log(`[Watchdog] Startup sweep complete. Terminalized ${expiredCount} expired attempts.`);
    }
    catch (error) {
        console.error('[Watchdog] Error during startup sweep:', error);
    }
}
/**
 * Start watchdog service
 */
function startWatchdog(intervalMs = 1000) {
    if (isRunning) {
        console.warn('[Watchdog] Already running');
        return;
    }
    console.log(`[Watchdog] Starting with ${intervalMs}ms interval`);
    // Run startup sweep
    startupSweep().catch(err => {
        console.error('[Watchdog] Startup sweep failed:', err);
    });
    // Start periodic tick
    watchdogInterval = setInterval(() => {
        watchdogTick().catch(err => {
            console.error('[Watchdog] Tick failed:', err);
        });
    }, intervalMs);
    isRunning = true;
}
/**
 * Stop watchdog service
 */
function stopWatchdog() {
    if (!isRunning) {
        console.warn('[Watchdog] Not running');
        return;
    }
    console.log('[Watchdog] Stopping');
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    isRunning = false;
}
/**
 * Get watchdog status
 */
function getWatchdogStatus() {
    return {
        running: isRunning,
        interval_ms: watchdogInterval ? 1000 : null
    };
}
module.exports = {
    generateAttemptId,
    startWatchdog,
    stopWatchdog,
    getWatchdogStatus,
    startupSweep,
    watchdogTick,
    handleExpiredLease,
    applyFailedAttemptAccounting,
    clearActiveAttemptFields
};
//# sourceMappingURL=execution-watchdog.js.map