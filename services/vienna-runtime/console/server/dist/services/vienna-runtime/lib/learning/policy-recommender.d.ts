/**
 * Policy Recommender
 */
export class PolicyRecommender {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Generate constraint relaxation recommendations
     *
     * Pattern: Action repeatedly denied by same constraint
     * Recommendation: Relax constraint parameters
     */
    recommendConstraintRelaxation(pattern: any, options?: {}): Promise<{
        recommendation_id: string;
        recommendation_type: string;
        target_policy_id: any;
        proposed_change: {
            constraints: any;
        };
        pattern_id: any;
        confidence: any;
        evidence: {
            observation_window_days: any;
            event_count: any;
            supporting_events: any;
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    }>;
    /**
     * Generate new policy recommendations
     *
     * Pattern: Remediation success varies by time/environment
     * Recommendation: Add policy to restrict to successful patterns
     */
    recommendNewPolicy(pattern: any, options?: {}): Promise<{
        recommendation_id: string;
        recommendation_type: string;
        proposed_change: {
            new_policy: {
                policy_name: string;
                action_type: any;
                target_type: any;
                constraints: {
                    time_window: {
                        allowed_windows: {
                            start: string;
                            end: string;
                        }[];
                        timezone: string;
                    };
                };
                priority: number;
                enabled: boolean;
            };
        };
        pattern_id: any;
        confidence: number;
        evidence: {
            observation_window_days: any;
            event_count: any;
            success_rate: any;
            supporting_events: any;
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    }>;
    /**
     * Generate policy removal recommendations
     *
     * Pattern: Policy never denies actions
     * Recommendation: Remove unnecessary policy
     */
    recommendPolicyRemoval(policyId: any, options?: {}): Promise<{
        recommendation_id: string;
        recommendation_type: string;
        target_policy_id: any;
        proposed_change: {
            action: string;
            reason: string;
        };
        pattern_id: any;
        confidence: number;
        evidence: {
            observation_window_days: any;
            event_count: any;
            denial_count: number;
            approval_count: any;
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    }>;
    /**
     * Generate priority adjustment recommendations
     *
     * Pattern: Policy A blocks what Policy B would allow
     * Recommendation: Swap priorities
     */
    recommendPriorityAdjustment(pattern: any, options?: {}): Promise<{
        recommendation_id: string;
        recommendation_type: string;
        target_policy_id: any;
        proposed_change: {
            action: string;
            reason: string;
            suggested_priority: number;
        };
        pattern_id: any;
        confidence: number;
        evidence: {
            observation_window_days: any;
            event_count: any;
            override_count: number;
            override_examples: any[];
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    }>;
    /**
     * Generate recommendations from pattern
     */
    generateRecommendations(pattern: any, options?: {}): Promise<({
        recommendation_id: string;
        recommendation_type: string;
        target_policy_id: any;
        proposed_change: {
            constraints: any;
        };
        pattern_id: any;
        confidence: any;
        evidence: {
            observation_window_days: any;
            event_count: any;
            supporting_events: any;
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    } | {
        recommendation_id: string;
        recommendation_type: string;
        proposed_change: {
            new_policy: {
                policy_name: string;
                action_type: any;
                target_type: any;
                constraints: {
                    time_window: {
                        allowed_windows: {
                            start: string;
                            end: string;
                        }[];
                        timezone: string;
                    };
                };
                priority: number;
                enabled: boolean;
            };
        };
        pattern_id: any;
        confidence: number;
        evidence: {
            observation_window_days: any;
            event_count: any;
            success_rate: any;
            supporting_events: any;
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    } | {
        recommendation_id: string;
        recommendation_type: string;
        target_policy_id: any;
        proposed_change: {
            action: string;
            reason: string;
            suggested_priority: number;
        };
        pattern_id: any;
        confidence: number;
        evidence: {
            observation_window_days: any;
            event_count: any;
            override_count: number;
            override_examples: any[];
        };
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        created_at: string;
    })[]>;
    /**
     * Generate deterministic recommendation ID
     */
    _generateRecommendationId(data: any): string;
}
export namespace RecommendationType {
    let CONSTRAINT_RELAXATION: string;
    let NEW_POLICY: string;
    let POLICY_REMOVAL: string;
    let PRIORITY_ADJUSTMENT: string;
}
//# sourceMappingURL=policy-recommender.d.ts.map