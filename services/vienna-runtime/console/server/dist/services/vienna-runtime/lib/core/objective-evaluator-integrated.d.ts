/**
 * Objective Evaluator with Gate Integration
 */
export class ObjectiveEvaluator {
    constructor(stateGraph: any, reconciliationGate: any, options?: {});
    stateGraph: any;
    reconciliationGate: any;
    observers: any;
    /**
     * Evaluate single objective
     */
    evaluateObjective(objectiveId: any): Promise<EvaluationResult | {
        skipped: boolean;
        reason: string;
        objective_id: any;
    }>;
    /**
     * Evaluate all active objectives
     */
    evaluateAll(filters?: {}): Promise<(EvaluationResult | {
        skipped: boolean;
        reason: string;
        objective_id: any;
    } | {
        objective_id: any;
        error: any;
        failed: boolean;
    })[]>;
    /**
     * Observe current system state
     */
    _observeState(objective: any): Promise<any>;
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
    _determineAction(objective: any, result: any): Promise<void>;
    /**
     * Handle passive recovery from cooldown
     */
    _handlePassiveRecovery(objective: any, result: any): Promise<void>;
    /**
     * Handle drift detected → request gate admission
     */
    _handleDriftDetected(objective: any, result: any): Promise<void>;
    /**
     * Get observer for target type
     */
    _getObserver(targetType: any): any;
    /**
     * Get default observers
     */
    _getDefaultObservers(): {
        service: any;
        endpoint: any;
        provider: any;
        resource: any;
        system: any;
    };
    /**
     * Observe service state
     */
    _observeService(objective: any): Promise<ObservationResult>;
    /**
     * Observe endpoint state
     */
    _observeEndpoint(objective: any): Promise<ObservationResult>;
    /**
     * Observe provider state
     */
    _observeProvider(objective: any): Promise<ObservationResult>;
    /**
     * Observe resource state (placeholder)
     */
    _observeResource(objective: any): Promise<ObservationResult>;
    /**
     * Observe system state (placeholder)
     */
    _observeSystem(objective: any): Promise<ObservationResult>;
}
/**
 * Observation result
 */
export class ObservationResult {
    constructor(observed: any, satisfied: any, confidence?: number);
    observed_state: any;
    objective_satisfied: any;
    confidence: number;
    observation_timestamp: string;
}
/**
 * Evaluation result
 */
export class EvaluationResult {
    constructor(objective: any, observation: any);
    objective_id: any;
    evaluation_timestamp: string;
    observed_state: any;
    objective_satisfied: any;
    violation_detected: boolean;
    confidence: any;
    action_taken: any;
    reconciliation_admitted: boolean;
    reconciliation_generation: any;
    skip_reason: any;
    triggered_plan_id: any;
    triggered_execution_id: any;
    result_summary: any;
    state_transition: any;
}
//# sourceMappingURL=objective-evaluator-integrated.d.ts.map