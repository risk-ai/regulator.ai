export = PlanOptimizer;
declare class PlanOptimizer {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Suggest step reordering optimization
     */
    suggestStepReordering(planTemplateId: any, options?: {}): Promise<{
        improvement_id: string;
        plan_template_id: any;
        improvement_type: string;
        proposed_change: {
            remove_steps: any[];
            reason: string;
        };
        expected_benefit: {
            time_reduction_pct: number;
            steps_removed: number;
        };
        evidence: {
            executions_analyzed: number;
            avg_duration_current_ms: number;
            avg_duration_proposed_ms: number;
            skippable_steps: {
                step_id: any;
                skip_rate: number;
                avg_duration_ms: number;
            }[];
        };
        confidence: number;
        created_at: string;
    }>;
    /**
     * Suggest verification strength adjustment
     */
    suggestVerificationAdjustment(planTemplateId: any, options?: {}): Promise<{
        improvement_id: string;
        plan_template_id: any;
        improvement_type: string;
        proposed_change: {
            from_strength: string;
            to_strength: string;
            remove_checks: any[];
        };
        expected_benefit: {
            time_reduction_pct: number;
            success_rate_impact: number;
        };
        evidence: {
            executions_analyzed: number;
            strong_success_rate: number;
            medium_success_rate: number;
            avg_strong_duration_ms: number;
        };
        confidence: number;
        created_at: string;
    }>;
    /**
     * Suggest retry policy tuning
     */
    suggestRetryTuning(planTemplateId: any, options?: {}): Promise<{
        improvement_id: string;
        plan_template_id: any;
        improvement_type: string;
        proposed_change: {
            from_max_attempts: number;
            to_max_attempts: number;
            reason: string;
        };
        expected_benefit: {
            retry_overhead_reduction_pct: number;
        };
        evidence: {
            executions_analyzed: number;
            first_retry_recovery_rate: number;
            total_retries: any;
        };
        confidence: number;
        created_at: string;
    }>;
    /**
     * Suggest timeout adjustment
     */
    suggestTimeoutAdjustment(planTemplateId: any, options?: {}): Promise<{
        improvement_id: string;
        plan_template_id: any;
        improvement_type: string;
        proposed_change: {
            from_timeout_ms: any;
            to_timeout_ms: number;
            reason: string;
        };
        expected_benefit: {
            faster_failure_detection: boolean;
            timeout_reduction_pct: number;
        };
        evidence: {
            executions_analyzed: number;
            p95_duration_ms: number;
            current_timeout_ms: any;
        };
        confidence: number;
        created_at: string;
    }>;
    _getExecutionHistory(planTemplateId: any, options?: {}): Promise<any[]>;
    _analyzeStepStats(executions: any): {
        step_id: any;
        skip_rate: number;
        avg_duration_ms: number;
    }[];
    _analyzeVerificationStats(executions: any): {
        checks: {
            check_id: any;
            check_type: any;
            success_rate: number;
            avg_duration_ms: number;
        }[];
        avg_total_duration_ms: number;
    };
    _determineVerificationStrength(verificationStats: any): "medium" | "strong" | "weak";
    _analyzeRetryStats(executions: any): {
        total_retries: any;
        recovery_by_attempt: {};
        current_max_attempts: number;
        avg_retry_duration_ms: number;
        avg_total_duration_ms: number;
    };
    _avg(numbers: any): number;
    _percentile(arr: any, p: any): any;
    _calculateConfidence(sampleSize: any, metric: any): 0.5 | 0.9 | 0.85 | 0.7;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=plan-optimizer.d.ts.map