/**
 * Objective Evaluator — Phase 9.4
 *
 * Deterministic observation loop for objective state management.
 *
 * Core job:
 * - Observe system state
 * - Detect violations
 * - Transition objective state
 * - Record evaluation results
 *
 * Boundary: Does NOT execute remediation (that's Phase 9.5)
 */
const { OBJECTIVE_STATUS } = require('./objective-schema');
const { TRANSITION_REASON, isStable, isRemediating } = require('./objective-state-machine');
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
        this.action_taken = null;
        this.triggered_plan_id = null;
        this.triggered_execution_id = null;
        this.result_summary = null;
        this.state_transition = null;
    }
}
/**
 * Objective Evaluator
 */
class ObjectiveEvaluator {
    constructor(stateGraph, options = {}) {
        this.stateGraph = stateGraph;
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
        // Skip if in terminal/suspended state
        if (objective.status === OBJECTIVE_STATUS.ARCHIVED) {
            return {
                skipped: true,
                reason: 'objective_archived',
                objective_id: objectiveId
            };
        }
        if (objective.status === OBJECTIVE_STATUS.SUSPENDED) {
            return {
                skipped: true,
                reason: 'objective_suspended',
                objective_id: objectiveId
            };
        }
        // Skip if already remediating (don't re-evaluate during remediation)
        if (isRemediating(objective.status)) {
            return {
                skipped: true,
                reason: 'remediation_in_progress',
                objective_id: objectiveId
            };
        }
        // Observe current state
        const observation = await this._observeState(objective);
        // Create evaluation result
        const result = new EvaluationResult(objective, observation);
        // Determine action based on current state + observation
        this._determineAction(objective, result);
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
        // Execute state transition if needed
        if (result.state_transition) {
            const { to_status, reason, metadata } = result.state_transition;
            this.stateGraph.updateObjectiveStatus(objective.objective_id, to_status, reason, metadata);
        }
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
     */
    _determineAction(objective, result) {
        const currentStatus = objective.status;
        const satisfied = result.objective_satisfied;
        // Case 1: Objective just declared → move to monitoring
        if (currentStatus === OBJECTIVE_STATUS.DECLARED) {
            result.action_taken = 'monitoring';
            result.state_transition = {
                to_status: OBJECTIVE_STATUS.MONITORING,
                reason: TRANSITION_REASON.EVALUATION_STARTED,
                metadata: { first_evaluation: true }
            };
            result.result_summary = 'Objective evaluation started';
            return;
        }
        // Case 2: Currently monitoring/healthy + satisfied → healthy
        if ((currentStatus === OBJECTIVE_STATUS.MONITORING || currentStatus === OBJECTIVE_STATUS.HEALTHY) && satisfied) {
            result.action_taken = 'monitoring';
            if (currentStatus === OBJECTIVE_STATUS.MONITORING) {
                result.state_transition = {
                    to_status: OBJECTIVE_STATUS.HEALTHY,
                    reason: TRANSITION_REASON.SYSTEM_HEALTHY,
                    metadata: { confidence: result.confidence }
                };
                result.result_summary = 'System healthy';
            }
            else {
                // Already healthy, no transition needed
                result.result_summary = 'System remains healthy';
            }
            return;
        }
        // Case 3: Currently monitoring/healthy + NOT satisfied → violation detected
        if ((currentStatus === OBJECTIVE_STATUS.MONITORING || currentStatus === OBJECTIVE_STATUS.HEALTHY) && !satisfied) {
            result.action_taken = 'remediation_triggered';
            result.state_transition = {
                to_status: OBJECTIVE_STATUS.VIOLATION_DETECTED,
                reason: TRANSITION_REASON.SYSTEM_UNHEALTHY,
                metadata: {
                    confidence: result.confidence,
                    observed_state: result.observed_state
                }
            };
            result.result_summary = 'Violation detected';
            result.triggered_plan_id = objective.remediation_plan;
            return;
        }
        // Case 4: Currently restored + satisfied → back to monitoring
        if (currentStatus === OBJECTIVE_STATUS.RESTORED && satisfied) {
            result.action_taken = 'monitoring';
            result.state_transition = {
                to_status: OBJECTIVE_STATUS.MONITORING,
                reason: TRANSITION_REASON.SYSTEM_HEALTHY,
                metadata: { confidence: result.confidence }
            };
            result.result_summary = 'System stable after restoration';
            return;
        }
        // Case 5: Currently restored + NOT satisfied → back to monitoring, violation will be detected on next eval
        if (currentStatus === OBJECTIVE_STATUS.RESTORED && !satisfied) {
            result.action_taken = 'monitoring';
            result.state_transition = {
                to_status: OBJECTIVE_STATUS.MONITORING,
                reason: TRANSITION_REASON.SYSTEM_UNHEALTHY,
                metadata: {
                    confidence: result.confidence,
                    regression_after_restoration: true
                }
            };
            result.result_summary = 'System unhealthy after restoration (returning to monitoring)';
            return;
        }
        // Case 6: Currently failed → no automatic retry (requires manual intervention)
        if (currentStatus === OBJECTIVE_STATUS.FAILED) {
            result.action_taken = 'none';
            result.result_summary = 'Objective in failed state (manual intervention required)';
            return;
        }
        // Default: no action
        result.action_taken = 'none';
        result.result_summary = `No action for status=${currentStatus}, satisfied=${satisfied}`;
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
//# sourceMappingURL=objective-evaluator.js.map