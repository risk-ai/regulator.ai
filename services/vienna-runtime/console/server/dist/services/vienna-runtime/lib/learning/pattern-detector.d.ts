/**
 * Pattern Detector
 */
export class PatternDetector {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Detect failure clusters
     *
     * Groups similar failures by action_type, target_id, failure_reason
     */
    detectFailureClusters(options?: {}): Promise<{
        pattern_id: string;
        pattern_type: string;
        action_type: any;
        target_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: number;
        metadata: {
            failure_reason: any;
            first_observed: any;
            last_observed: any;
            evidence: any;
        };
    }[]>;
    /**
     * Detect policy conflicts
     *
     * Identifies policies that repeatedly block legitimate actions
     */
    detectPolicyConflicts(options?: {}): Promise<{
        pattern_id: string;
        pattern_type: string;
        policy_id: any;
        observation_window_days: any;
        event_count: any;
        confidence: number;
        metadata: {
            constraint_type: any;
            first_denial: any;
            last_denial: any;
            evidence: any;
        };
    }[]>;
    /**
     * Detect remediation effectiveness patterns
     *
     * Tracks remediation success/failure rates
     */
    detectRemediationEffectiveness(options?: {}): Promise<{
        pattern_id: string;
        pattern_type: string;
        action_type: any;
        target_type: any;
        observation_window_days: any;
        event_count: any;
        confidence: number;
        metadata: {
            plan_template: any;
            success_count: any;
            failure_count: any;
            success_rate: number;
            first_execution: any;
            last_execution: any;
            evidence: any;
        };
    }[]>;
    /**
     * Normalize failure reason for clustering
     */
    _normalizeFailureReason(error: any): any;
    /**
     * Calculate cluster confidence
     */
    _calculateClusterConfidence(cluster: any, lookbackDays: any): number;
    /**
     * Calculate conflict confidence
     */
    _calculateConflictConfidence(conflict: any, lookbackDays: any): number;
    /**
     * Calculate effectiveness confidence
     */
    _calculateEffectivenessConfidence(eff: any, lookbackDays: any): number;
    /**
     * Generate deterministic pattern ID
     */
    _generatePatternId(data: any): string;
}
export namespace PatternType {
    let FAILURE_CLUSTER: string;
    let POLICY_CONFLICT: string;
    let REMEDIATION_EFFECTIVENESS: string;
}
//# sourceMappingURL=pattern-detector.d.ts.map