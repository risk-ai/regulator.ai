/**
 * Vienna Execution Simulator
 *
 * Dry-run execution with predicted outcomes, no side effects.
 */
const { PlanGenerator } = require('../core/plan-generator');
const { getBudgetManager } = require('../economic/cost-model');
const { getResourceScheduler } = require('../economic/resource-scheduler');
/**
 * Simulation Mode
 */
const SIMULATION_MODES = {
    POLICY_ONLY: 'policy_only', // Simulate policy evaluation only
    SCHEDULING: 'scheduling', // Simulate scheduling decisions
    FULL_EXECUTION: 'full_execution' // Simulate full execution graph
};
/**
 * Simulated Execution Result
 */
class SimulatedResult {
    constructor(data) {
        this.simulation_id = data.simulation_id || this._generateId();
        this.mode = data.mode;
        this.intent = data.intent;
        this.plan = data.plan;
        // Predictions
        this.predicted_cost = data.predicted_cost || 0;
        this.predicted_latency_ms = data.predicted_latency_ms || 0;
        this.predicted_success_probability = data.predicted_success_probability || 0.95;
        // Policy simulation
        this.policy_evaluation = data.policy_evaluation || null;
        this.approval_required = data.approval_required || false;
        // Scheduling simulation
        this.scheduling_decision = data.scheduling_decision || null;
        // Execution prediction
        this.predicted_steps = data.predicted_steps || [];
        this.predicted_verification = data.predicted_verification || null;
        this.predicted_blockers = data.predicted_blockers || [];
        // Confidence scoring
        this.confidence = data.confidence || 0.8;
        this.confidence_breakdown = data.confidence_breakdown || {};
        // Metadata
        this.simulated_at = data.simulated_at || new Date().toISOString();
        this.simulation_duration_ms = data.simulation_duration_ms || 0;
    }
    /**
     * Generate simulation ID
     */
    _generateId() {
        return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    toJSON() {
        return {
            simulation_id: this.simulation_id,
            mode: this.mode,
            intent: this.intent,
            plan: this.plan,
            predicted_cost: this.predicted_cost,
            predicted_latency_ms: this.predicted_latency_ms,
            predicted_success_probability: this.predicted_success_probability,
            policy_evaluation: this.policy_evaluation,
            approval_required: this.approval_required,
            scheduling_decision: this.scheduling_decision,
            predicted_steps: this.predicted_steps,
            predicted_verification: this.predicted_verification,
            predicted_blockers: this.predicted_blockers,
            confidence: this.confidence,
            confidence_breakdown: this.confidence_breakdown,
            simulated_at: this.simulated_at,
            simulation_duration_ms: this.simulation_duration_ms
        };
    }
}
/**
 * Execution Simulator
 */
class ExecutionSimulator {
    constructor() {
        this.planGenerator = new PlanGenerator();
        this.budgetManager = getBudgetManager();
        this.resourceScheduler = getResourceScheduler();
        this.simulations = new Map();
    }
    /**
     * Simulate intent execution
     */
    async simulate(intent, context = {}) {
        const startTime = Date.now();
        const mode = context.mode || SIMULATION_MODES.FULL_EXECUTION;
        // Generate plan (real plan generation, but no persistence)
        const plan = await this.planGenerator.generatePlan(intent, {
            ...context,
            dry_run: true
        });
        let result = new SimulatedResult({
            mode,
            intent,
            plan
        });
        // Simulate policy evaluation
        if (mode === SIMULATION_MODES.POLICY_ONLY || mode === SIMULATION_MODES.FULL_EXECUTION) {
            result.policy_evaluation = await this._simulatePolicyEvaluation(plan, context);
            result.approval_required = plan.risk_tier === 'T1' || plan.risk_tier === 'T2';
        }
        // Simulate scheduling
        if (mode === SIMULATION_MODES.SCHEDULING || mode === SIMULATION_MODES.FULL_EXECUTION) {
            result.scheduling_decision = await this._simulateScheduling(plan, context);
            result.predicted_cost = result.scheduling_decision.selected_path?.estimated_cost || 0;
            result.predicted_latency_ms = result.scheduling_decision.selected_path?.estimated_latency_ms || 0;
        }
        // Simulate full execution
        if (mode === SIMULATION_MODES.FULL_EXECUTION) {
            result.predicted_steps = await this._simulateSteps(plan, context);
            result.predicted_verification = await this._simulateVerification(plan, context);
            result.predicted_blockers = this._identifyBlockers(result);
            result.predicted_success_probability = this._calculateSuccessProbability(result);
        }
        // Calculate confidence
        result.confidence = this._calculateConfidence(result);
        result.confidence_breakdown = this._getConfidenceBreakdown(result);
        result.simulation_duration_ms = Date.now() - startTime;
        // Store simulation
        this.simulations.set(result.simulation_id, result);
        return result;
    }
    /**
     * Simulate policy evaluation
     */
    async _simulatePolicyEvaluation(plan, context) {
        // Simplified policy simulation
        return {
            evaluated: true,
            policies_checked: ['budget', 'rate_limit', 'risk_tier'],
            all_passed: true,
            denial_reasons: [],
            simulated: true
        };
    }
    /**
     * Simulate scheduling decision
     */
    async _simulateScheduling(plan, context) {
        return await this.resourceScheduler.schedule(plan, {
            ...context,
            dry_run: true
        });
    }
    /**
     * Simulate execution steps
     */
    async _simulateSteps(plan, context) {
        if (!plan.steps) {
            return [];
        }
        return plan.steps.map((step, index) => ({
            step_index: index,
            step_action: step.action,
            predicted_status: 'completed',
            predicted_duration_ms: this._predictStepDuration(step),
            predicted_cost: this.budgetManager.costModel.estimateCost(step, context),
            predicted_success_probability: 0.95,
            dependencies_met: true,
            simulated: true
        }));
    }
    /**
     * Simulate verification
     */
    async _simulateVerification(plan, context) {
        if (!plan.verification_spec) {
            return null;
        }
        return {
            predicted_checks: plan.verification_spec.checks || [],
            predicted_checks_passed: (plan.verification_spec.checks || []).length,
            predicted_checks_failed: 0,
            predicted_objective_achieved: true,
            predicted_duration_ms: 1000,
            simulated: true
        };
    }
    /**
     * Identify potential blockers
     */
    _identifyBlockers(result) {
        const blockers = [];
        // Budget blocker
        if (result.policy_evaluation && !result.policy_evaluation.all_passed) {
            blockers.push({
                type: 'policy_denial',
                severity: 'high',
                reason: 'Policy evaluation would deny execution'
            });
        }
        // Approval blocker
        if (result.approval_required) {
            blockers.push({
                type: 'approval_required',
                severity: 'medium',
                reason: 'T1/T2 action requires operator approval'
            });
        }
        // Scheduling blocker
        if (result.scheduling_decision && !result.scheduling_decision.scheduled) {
            blockers.push({
                type: 'scheduling_failed',
                severity: 'high',
                reason: result.scheduling_decision.reason
            });
        }
        return blockers;
    }
    /**
     * Calculate predicted success probability
     */
    _calculateSuccessProbability(result) {
        if (result.predicted_blockers.length > 0) {
            const highSeverityBlockers = result.predicted_blockers.filter(b => b.severity === 'high');
            if (highSeverityBlockers.length > 0) {
                return 0.1; // Very low probability with high-severity blockers
            }
            return 0.6; // Medium probability with medium-severity blockers
        }
        // Average step success probabilities
        if (result.predicted_steps.length > 0) {
            const avgStepProbability = result.predicted_steps.reduce((sum, step) => sum + step.predicted_success_probability, 0) / result.predicted_steps.length;
            return avgStepProbability;
        }
        return 0.95; // Default high probability
    }
    /**
     * Calculate overall confidence in simulation
     */
    _calculateConfidence(result) {
        const factors = this._getConfidenceBreakdown(result);
        const weights = {
            policy: 0.3,
            scheduling: 0.2,
            execution: 0.3,
            verification: 0.2
        };
        let confidence = 0;
        confidence += factors.policy * weights.policy;
        confidence += factors.scheduling * weights.scheduling;
        confidence += factors.execution * weights.execution;
        confidence += factors.verification * weights.verification;
        return confidence;
    }
    /**
     * Get confidence breakdown
     */
    _getConfidenceBreakdown(result) {
        return {
            policy: result.policy_evaluation ? 0.9 : 0.5,
            scheduling: result.scheduling_decision?.scheduled ? 0.9 : 0.5,
            execution: result.predicted_steps.length > 0 ? 0.8 : 0.5,
            verification: result.predicted_verification ? 0.85 : 0.5
        };
    }
    /**
     * Predict step duration
     */
    _predictStepDuration(step) {
        // Simple heuristic based on action type
        const baseDuration = 500; // ms
        const multipliers = {
            'restart_service': 3,
            'health_check': 1,
            'query_agent': 2,
            'default': 1
        };
        const multiplier = multipliers[step.action] || multipliers.default;
        return baseDuration * multiplier;
    }
    /**
     * Compare multiple simulations
     */
    async compareSimulations(intent, scenarios) {
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.simulate(intent, scenario.context);
            results.push({
                scenario_name: scenario.name,
                ...result.toJSON()
            });
        }
        return {
            intent,
            scenarios: results,
            comparison: this._generateComparison(results)
        };
    }
    /**
     * Generate comparison matrix
     */
    _generateComparison(results) {
        return {
            cheapest: this._findBest(results, 'predicted_cost', 'min'),
            fastest: this._findBest(results, 'predicted_latency_ms', 'min'),
            most_reliable: this._findBest(results, 'predicted_success_probability', 'max'),
            highest_confidence: this._findBest(results, 'confidence', 'max')
        };
    }
    /**
     * Find best simulation by metric
     */
    _findBest(results, metric, direction) {
        if (results.length === 0) {
            return null;
        }
        let best = results[0];
        for (const result of results) {
            if (direction === 'min') {
                if (result[metric] < best[metric]) {
                    best = result;
                }
            }
            else {
                if (result[metric] > best[metric]) {
                    best = result;
                }
            }
        }
        return {
            scenario_name: best.scenario_name,
            value: best[metric]
        };
    }
    /**
     * Get simulation by ID
     */
    getSimulation(simulationId) {
        return this.simulations.get(simulationId);
    }
    /**
     * List simulations
     */
    listSimulations(filters = {}) {
        let simulations = Array.from(this.simulations.values());
        if (filters.mode) {
            simulations = simulations.filter(s => s.mode === filters.mode);
        }
        return simulations;
    }
}
/**
 * Global simulator instance
 */
let globalSimulator = null;
function getSimulator() {
    if (!globalSimulator) {
        globalSimulator = new ExecutionSimulator();
    }
    return globalSimulator;
}
module.exports = {
    SIMULATION_MODES,
    SimulatedResult,
    ExecutionSimulator,
    getSimulator
};
//# sourceMappingURL=simulator.js.map