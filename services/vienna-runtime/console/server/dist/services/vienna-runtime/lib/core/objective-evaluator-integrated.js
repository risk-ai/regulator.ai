/**
 * Objective Evaluator — Phase 10.1d Integration
 *
 * Deterministic observation loop with reconciliation gate integration.
 *
 * Core job:
 * - Observe system state
 * - Detect violations
 * - Request gate admission
 * - Record evaluation results
 *
 * Boundary: Does NOT execute remediation (that's remediation trigger)
 *
 * New contract:
 * - Evaluator may observe divergence
 * - Only the gate may authorize reconciliation
 * - Only verification may close recovery successfully
 */
const { ReconciliationStatus } = require('./reconciliation-state-machine');
/**
 * Observation result
 */
class ObservationResult {
    constructor(observed, satisfied, confidence = 1.0) {
        this.observed_state = observed;
        this.objective_satisfied = satisfied;
        this.confidence = confidence;
        this.observation_timestamp = new Date().toISOString();
    }
}
/**
 * Evaluation result
 */
class EvaluationResult {
    constructor(objective, observation) {
        this.objective_id = objective.objective_id;
        this.evaluation_timestamp = new Date().toISOString();
        this.observed_state = observation.observed_state;
        this.objective_satisfied = observation.objective_satisfied;
        this.violation_detected = !observation.objective_satisfied;
        this.confidence = observation.confidence;
        // Reconciliation-aware fields
        this.action_taken = null;
        this.reconciliation_admitted = false;
        this.reconciliation_generation = null;
        this.skip_reason = null;
        // Legacy fields (for backward compatibility during transition)
        this.triggered_plan_id = null;
        this.triggered_execution_id = null;
        this.result_summary = null;
        this.state_transition = null;
    }
}
/**
 * Objective Evaluator with Gate Integration
 */
class ObjectiveEvaluator {
    constructor(stateGraph, reconciliationGate, options = {}) {
        this.stateGraph = stateGraph;
        this.reconciliationGate = reconciliationGate;
        this.observers = options.observers || this._getDefaultObservers();
    }
    /**
     * Evaluate single objective
     */
    async evaluateObjective(objectiveId) {
        const objective = this.stateGraph.getObjective(objectiveId);
        if (!objective) {
            throw new Error(`Objective not found: ${objectiveId}`);
        }
        // Skip if disabled
        if (!objective.is_enabled) {
            return {
                skipped: true,
                reason: 'objective_disabled',
                objective_id: objectiveId
            };
        }
        // Skip if archived
        if (objective.status === 'archived') {
            return {
                skipped: true,
                reason: 'objective_archived',
                objective_id: objectiveId
            };
        }
        // Skip if suspended
        if (objective.status === 'suspended') {
            return {
                skipped: true,
                reason: 'objective_suspended',
                objective_id: objectiveId
            };
        }
        // Skip if already reconciling (deduplication)
        if (objective.reconciliation_status === ReconciliationStatus.RECONCILING) {
            return {
                skipped: true,
                reason: 'reconciliation_in_progress',
                objective_id: objectiveId
            };
        }
        // Observe current state
        const observation = await this._observeState(objective);
        // Create evaluation result
        const result = new EvaluationResult(objective, observation);
        // Determine action based on current state + observation
        await this._determineAction(objective, result);
        // Persist evaluation
        const evaluationId = this.stateGraph.recordObjectiveEvaluation({
            objective_id: objective.objective_id,
            observed_state: result.observed_state,
            objective_satisfied: result.objective_satisfied,
            violation_detected: result.violation_detected,
            action_taken: result.action_taken,
            result_summary: result.result_summary,
            triggered_plan_id: result.triggered_plan_id,
            triggered_execution_id: result.triggered_execution_id
        });
        result.evaluation_id = evaluationId;
        return result;
    }
    /**
     * Evaluate all active objectives
     */
    async evaluateAll(filters = {}) {
        const objectives = this.stateGraph.listObjectives({
            ...filters,
            is_enabled: true
        });
        const results = [];
        for (const objective of objectives) {
            try {
                const result = await this.evaluateObjective(objective.objective_id);
                results.push(result);
            }
            catch (error) {
                results.push({
                    objective_id: objective.objective_id,
                    error: error.message,
                    failed: true
                });
            }
        }
        return results;
    }
    /**
     * Observe current system state
     */
    async _observeState(objective) {
        const observer = this._getObserver(objective.target_type);
        if (!observer) {
            throw new Error(`No observer for target_type: ${objective.target_type}`);
        }
        return await observer(objective);
    }
    /**
     * Determine action based on objective state + observation
     *
     * New flow:
     * 1. Observe state (healthy/unhealthy)
     * 2. Check passive recovery (cooldown → idle if healthy)
     * 3. If unhealthy, request gate admission
     * 4. If admitted, record admission (state transition happens in gate)
     * 5. If denied, record skip reason
     */
    async _determineAction(objective, result) {
        const currentStatus = objective.status;
        const satisfied = result.objective_satisfied;
        const reconciliationStatus = objective.reconciliation_status || ReconciliationStatus.IDLE;
        // Case 1: Passive recovery from cooldown
        if (reconciliationStatus === ReconciliationStatus.COOLDOWN && satisfied) {
            // System recovered during cooldown
            await this._handlePassiveRecovery(objective, result);
            return;
        }
        // Case 2: System is healthy
        if (satisfied) {
            result.action_taken = 'monitoring'; // DB-compliant value
            result.result_summary = 'System healthy';
            return;
        }
        // Case 3: System is unhealthy → request gate admission
        await this._handleDriftDetected(objective, result);
    }
    /**
     * Handle passive recovery from cooldown
     */
    async _handlePassiveRecovery(objective, result) {
        // Transition: cooldown → idle
        const updates = {
            reconciliation_status: ReconciliationStatus.IDLE,
            reconciliation_attempt_count: 0,
            reconciliation_cooldown_until: null,
            reconciliation_last_result: 'recovered',
            reconciliation_last_error: null,
            reconciliation_last_verified_at: new Date().toISOString()
        };
        this.stateGraph.updateObjective(objective.objective_id, updates);
        result.action_taken = 'monitoring'; // DB-compliant value (passive recovery)
        result.result_summary = 'Passive recovery from cooldown';
    }
    /**
     * Handle drift detected → request gate admission
     */
    async _handleDriftDetected(objective, result) {
        const context = {
            drift_reason: 'evaluation_detected_violation',
            observed_state: result.observed_state,
            current_time: Date.now()
        };
        // Request admission from gate
        const decision = this.reconciliationGate.requestAdmission(objective.objective_id, context);
        if (!decision.admitted) {
            // Admission denied
            result.action_taken = 'none'; // DB-compliant value (no action taken)
            result.skip_reason = decision.reason;
            result.result_summary = `Drift detected but reconciliation skipped: ${decision.reason}`;
            // Record reconciliation skipped event
            this.stateGraph.recordObjectiveTransition(objective.objective_id, objective.reconciliation_status, objective.reconciliation_status, 'objective.reconciliation.skipped', {
                skip_reason: decision.reason,
                generation: objective.reconciliation_generation,
                attempt_count: objective.reconciliation_attempt_count,
                drift_detected: true,
                observed_state: result.observed_state
            });
            return;
        }
        // Admission allowed → perform atomic transition
        const admitted = this.reconciliationGate.admitAndTransition(objective.objective_id, context);
        if (!admitted.admitted) {
            // Race condition or state changed
            result.action_taken = 'none'; // DB-compliant value (no action taken)
            result.skip_reason = admitted.reason;
            result.result_summary = `Drift detected but admission failed: ${admitted.reason}`;
            // Record reconciliation skipped event (race condition variant)
            this.stateGraph.recordObjectiveTransition(objective.objective_id, objective.reconciliation_status, objective.reconciliation_status, 'objective.reconciliation.skipped', {
                skip_reason: admitted.reason,
                generation: objective.reconciliation_generation,
                attempt_count: objective.reconciliation_attempt_count,
                race_condition: true
            });
            return;
        }
        // Successfully admitted
        result.action_taken = 'remediation_triggered'; // DB-compliant value
        result.reconciliation_admitted = true;
        result.reconciliation_generation = admitted.generation;
        result.result_summary = `Drift detected, reconciliation admitted (generation ${admitted.generation})`;
        // For backward compatibility with coordinator
        result.triggered_plan_id = objective.remediation_plan;
    }
    /**
     * Get observer for target type
     */
    _getObserver(targetType) {
        return this.observers[targetType];
    }
    /**
     * Get default observers
     */
    _getDefaultObservers() {
        return {
            service: this._observeService.bind(this),
            endpoint: this._observeEndpoint.bind(this),
            provider: this._observeProvider.bind(this),
            resource: this._observeResource.bind(this),
            system: this._observeSystem.bind(this)
        };
    }
    /**
     * Observe service state
     */
    async _observeService(objective) {
        const { target_id, desired_state } = objective;
        // Check if service exists in State Graph
        const service = this.stateGraph.getService(target_id);
        const observed = {
            service_exists: !!service,
            service_active: service ? service.status === 'running' : false,
            service_healthy: service ? service.health === 'healthy' : false,
            last_check: service ? service.last_check_at : null
        };
        // Compare against desired state
        let satisfied = true;
        if (desired_state.service_active !== undefined) {
            if (observed.service_active !== desired_state.service_active) {
                satisfied = false;
            }
        }
        if (desired_state.service_healthy !== undefined) {
            if (observed.service_healthy !== desired_state.service_healthy) {
                satisfied = false;
            }
        }
        return new ObservationResult(observed, satisfied, 0.95);
    }
    /**
     * Observe endpoint state
     */
    async _observeEndpoint(objective) {
        const { target_id, desired_state } = objective;
        // Check if endpoint exists in State Graph
        const endpoint = this.stateGraph.getEndpoint(target_id);
        const observed = {
            endpoint_exists: !!endpoint,
            endpoint_active: endpoint ? endpoint.status === 'active' : false,
            endpoint_healthy: endpoint ? endpoint.health === 'healthy' : false,
            last_health_check: endpoint ? endpoint.last_health_check : null
        };
        // Compare against desired state
        let satisfied = true;
        if (desired_state.endpoint_active !== undefined) {
            if (observed.endpoint_active !== desired_state.endpoint_active) {
                satisfied = false;
            }
        }
        if (desired_state.endpoint_healthy !== undefined) {
            if (observed.endpoint_healthy !== desired_state.endpoint_healthy) {
                satisfied = false;
            }
        }
        return new ObservationResult(observed, satisfied, 0.90);
    }
    /**
     * Observe provider state
     */
    async _observeProvider(objective) {
        const { target_id, desired_state } = objective;
        const provider = this.stateGraph.getProvider(target_id);
        const observed = {
            provider_exists: !!provider,
            provider_active: provider ? provider.status === 'active' : false,
            provider_healthy: provider ? provider.health === 'healthy' : false,
            rate_limited: provider ? provider.health === 'rate_limited' : false
        };
        let satisfied = true;
        if (desired_state.provider_active !== undefined) {
            if (observed.provider_active !== desired_state.provider_active) {
                satisfied = false;
            }
        }
        if (desired_state.provider_healthy !== undefined) {
            if (observed.provider_healthy !== desired_state.provider_healthy) {
                satisfied = false;
            }
        }
        return new ObservationResult(observed, satisfied, 0.90);
    }
    /**
     * Observe resource state (placeholder)
     */
    async _observeResource(objective) {
        // Placeholder: would check disk space, memory, CPU, etc.
        return new ObservationResult({}, true, 0.80);
    }
    /**
     * Observe system state (placeholder)
     */
    async _observeSystem(objective) {
        // Placeholder: would check overall system health
        return new ObservationResult({}, true, 0.80);
    }
}
module.exports = {
    ObjectiveEvaluator,
    ObservationResult,
    EvaluationResult
};
//# sourceMappingURL=objective-evaluator-integrated.js.map