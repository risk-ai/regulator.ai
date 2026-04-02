export namespace SIMULATION_MODES {
    let POLICY_ONLY: string;
    let SCHEDULING: string;
    let FULL_EXECUTION: string;
}
/**
 * Simulated Execution Result
 */
export class SimulatedResult {
    constructor(data: any);
    simulation_id: any;
    mode: any;
    intent: any;
    plan: any;
    predicted_cost: any;
    predicted_latency_ms: any;
    predicted_success_probability: any;
    policy_evaluation: any;
    approval_required: any;
    scheduling_decision: any;
    predicted_steps: any;
    predicted_verification: any;
    predicted_blockers: any;
    confidence: any;
    confidence_breakdown: any;
    simulated_at: any;
    simulation_duration_ms: any;
    /**
     * Generate simulation ID
     */
    _generateId(): string;
    toJSON(): {
        simulation_id: any;
        mode: any;
        intent: any;
        plan: any;
        predicted_cost: any;
        predicted_latency_ms: any;
        predicted_success_probability: any;
        policy_evaluation: any;
        approval_required: any;
        scheduling_decision: any;
        predicted_steps: any;
        predicted_verification: any;
        predicted_blockers: any;
        confidence: any;
        confidence_breakdown: any;
        simulated_at: any;
        simulation_duration_ms: any;
    };
}
/**
 * Execution Simulator
 */
export class ExecutionSimulator {
    planGenerator: any;
    budgetManager: any;
    resourceScheduler: any;
    simulations: Map<any, any>;
    /**
     * Simulate intent execution
     */
    simulate(intent: any, context?: {}): Promise<SimulatedResult>;
    /**
     * Simulate policy evaluation
     */
    _simulatePolicyEvaluation(plan: any, context: any): Promise<{
        evaluated: boolean;
        policies_checked: string[];
        all_passed: boolean;
        denial_reasons: any[];
        simulated: boolean;
    }>;
    /**
     * Simulate scheduling decision
     */
    _simulateScheduling(plan: any, context: any): Promise<any>;
    /**
     * Simulate execution steps
     */
    _simulateSteps(plan: any, context: any): Promise<any>;
    /**
     * Simulate verification
     */
    _simulateVerification(plan: any, context: any): Promise<{
        predicted_checks: any;
        predicted_checks_passed: any;
        predicted_checks_failed: number;
        predicted_objective_achieved: boolean;
        predicted_duration_ms: number;
        simulated: boolean;
    }>;
    /**
     * Identify potential blockers
     */
    _identifyBlockers(result: any): {
        type: string;
        severity: string;
        reason: any;
    }[];
    /**
     * Calculate predicted success probability
     */
    _calculateSuccessProbability(result: any): number;
    /**
     * Calculate overall confidence in simulation
     */
    _calculateConfidence(result: any): number;
    /**
     * Get confidence breakdown
     */
    _getConfidenceBreakdown(result: any): {
        policy: number;
        scheduling: number;
        execution: number;
        verification: number;
    };
    /**
     * Predict step duration
     */
    _predictStepDuration(step: any): number;
    /**
     * Compare multiple simulations
     */
    compareSimulations(intent: any, scenarios: any): Promise<{
        intent: any;
        scenarios: {
            simulation_id: any;
            mode: any;
            intent: any;
            plan: any;
            predicted_cost: any;
            predicted_latency_ms: any;
            predicted_success_probability: any;
            policy_evaluation: any;
            approval_required: any;
            scheduling_decision: any;
            predicted_steps: any;
            predicted_verification: any;
            predicted_blockers: any;
            confidence: any;
            confidence_breakdown: any;
            simulated_at: any;
            simulation_duration_ms: any;
            scenario_name: any;
        }[];
        comparison: {
            cheapest: {
                scenario_name: any;
                value: any;
            };
            fastest: {
                scenario_name: any;
                value: any;
            };
            most_reliable: {
                scenario_name: any;
                value: any;
            };
            highest_confidence: {
                scenario_name: any;
                value: any;
            };
        };
    }>;
    /**
     * Generate comparison matrix
     */
    _generateComparison(results: any): {
        cheapest: {
            scenario_name: any;
            value: any;
        };
        fastest: {
            scenario_name: any;
            value: any;
        };
        most_reliable: {
            scenario_name: any;
            value: any;
        };
        highest_confidence: {
            scenario_name: any;
            value: any;
        };
    };
    /**
     * Find best simulation by metric
     */
    _findBest(results: any, metric: any, direction: any): {
        scenario_name: any;
        value: any;
    };
    /**
     * Get simulation by ID
     */
    getSimulation(simulationId: any): any;
    /**
     * List simulations
     */
    listSimulations(filters?: {}): any[];
}
export function getSimulator(): any;
//# sourceMappingURL=simulator.d.ts.map