/**
 * Learning Coordinator
 */
export class LearningCoordinator {
    constructor(stateGraph: any);
    stateGraph: any;
    patternDetector: PatternDetector;
    policyRecommender: PolicyRecommender;
    planOptimizer: PlanOptimizer;
    feedbackIntegrator: FeedbackIntegrator;
    lastAnalysisAt: string;
    lastRecommendationAt: string;
    isRunning: boolean;
    /**
     * Start learning loop
     */
    start(options?: {}): void;
    analysisInterval: NodeJS.Timeout;
    recommendationInterval: NodeJS.Timeout;
    /**
     * Stop learning loop
     */
    stop(): void;
    /**
     * Record execution for pattern detection (called from plan-execution-engine)
     */
    recordExecution(executionData: any): Promise<void>;
    /**
     * Run observation phase
     *
     * Continuous: patterns detected from live execution data
     */
    runObservationPhase(options?: {}): Promise<{
        phase: string;
        status: string;
    }>;
    /**
     * Run analysis phase
     *
     * Every 6 hours: detect patterns, filter by confidence
     */
    runAnalysisPhase(options?: {}): Promise<{
        phase: string;
        patterns_detected: number;
        patterns_stored: number;
        pattern_types: {
            failure_clusters: number;
            policy_conflicts: number;
            remediation_effectiveness: number;
        };
        duration_ms: number;
        completed_at: string;
    }>;
    /**
     * Run recommendation phase
     *
     * Every 12 hours: generate recommendations from patterns
     */
    runRecommendationPhase(options?: {}): Promise<{
        phase: string;
        patterns_analyzed: any;
        recommendations_generated: number;
        recommendations_stored: number;
        recommendation_types: {};
        duration_ms: number;
        completed_at: string;
    }>;
    /**
     * Run application phase
     *
     * Gated: auto-apply or await operator approval
     */
    runApplicationPhase(options?: {}): Promise<{
        phase: string;
        pending_count: any;
        auto_applied: number;
        requires_approval: number;
        dry_run: any;
        applied_recommendations: {
            recommendation_id: any;
            result: {
                status: string;
                history_id: string;
            };
        }[];
        duration_ms: number;
    }>;
    /**
     * Get learning status
     */
    getStatus(): {
        is_running: boolean;
        last_analysis_at: string;
        last_recommendation_at: string;
        next_analysis_in_ms: number;
        next_recommendation_in_ms: number;
    };
    /**
     * Store pattern
     */
    _storePattern(pattern: any): Promise<void>;
    /**
     * Load active patterns
     */
    _loadActivePatterns(options?: {}): Promise<any>;
    /**
     * Store recommendation
     */
    _storeRecommendation(recommendation: any): Promise<void>;
    /**
     * Load pending recommendations
     */
    _loadPendingRecommendations(): Promise<any>;
    /**
     * Apply recommendation
     */
    _applyRecommendation(recommendation: any): Promise<{
        status: string;
        history_id: string;
    }>;
    /**
     * Count recommendation types
     */
    _countRecommendationTypes(recommendations: any): {};
    /**
     * Get time until next scheduled run
     */
    _getTimeUntilNextRun(interval: any): number;
}
export namespace LearningPhase {
    let OBSERVATION: string;
    let ANALYSIS: string;
    let RECOMMENDATION: string;
    let APPLICATION: string;
}
import { PatternDetector } from "./pattern-detector";
import { PolicyRecommender } from "./policy-recommender";
import PlanOptimizer = require("./plan-optimizer");
import FeedbackIntegrator = require("./feedback-integrator");
//# sourceMappingURL=learning-coordinator.d.ts.map