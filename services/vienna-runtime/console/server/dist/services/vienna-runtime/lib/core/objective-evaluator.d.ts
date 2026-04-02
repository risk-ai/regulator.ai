/**
 * Objective Evaluator
 */
export class ObjectiveEvaluator {
    constructor(stateGraph: any, options?: {});
    stateGraph: any;
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
     */
    _determineAction(objective: any, result: any): void;
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
    triggered_plan_id: any;
    triggered_execution_id: any;
    result_summary: any;
    state_transition: any;
}
//# sourceMappingURL=objective-evaluator.d.ts.map