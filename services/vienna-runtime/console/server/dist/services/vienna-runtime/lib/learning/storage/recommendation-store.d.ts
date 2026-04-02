export = RecommendationStore;
declare class RecommendationStore {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Create recommendation
     */
    createRecommendation(recommendation: any): Promise<any>;
    /**
     * Get recommendation by ID
     */
    getRecommendation(recommendationId: any): Promise<{
        recommendation_id: any;
        recommendation_type: any;
        target_policy_id: any;
        proposed_change: any;
        pattern_id: any;
        confidence: any;
        evidence: any;
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        status: any;
        created_at: any;
        applied_at: any;
        reverted_at: any;
        approved_by: any;
        denied_by: any;
        denial_reason: any;
    }>;
    /**
     * List recommendations
     */
    listRecommendations(filters?: {}): Promise<any>;
    /**
     * Update recommendation status
     */
    updateRecommendationStatus(recommendationId: any, status: any, metadata?: {}): Promise<void>;
    /**
     * List applied recommendations (for regression monitoring)
     */
    listAppliedRecommendations(options?: {}): Promise<any>;
    /**
     * Get recommendation with full context
     */
    getRecommendationWithContext(recommendationId: any): Promise<{
        pattern: any;
        recommendation_id: any;
        recommendation_type: any;
        target_policy_id: any;
        proposed_change: any;
        pattern_id: any;
        confidence: any;
        evidence: any;
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        status: any;
        created_at: any;
        applied_at: any;
        reverted_at: any;
        approved_by: any;
        denied_by: any;
        denial_reason: any;
    }>;
    /**
     * Archive recommendation
     */
    archiveRecommendation(recommendationId: any): Promise<{
        recommendation_id: any;
        recommendation_type: any;
        target_policy_id: any;
        proposed_change: any;
        pattern_id: any;
        confidence: any;
        evidence: any;
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        status: any;
        created_at: any;
        applied_at: any;
        reverted_at: any;
        approved_by: any;
        denied_by: any;
        denial_reason: any;
    }>;
    _deserializeRecommendation(row: any): {
        recommendation_id: any;
        recommendation_type: any;
        target_policy_id: any;
        proposed_change: any;
        pattern_id: any;
        confidence: any;
        evidence: any;
        auto_apply_eligible: boolean;
        requires_approval: boolean;
        status: any;
        created_at: any;
        applied_at: any;
        reverted_at: any;
        approved_by: any;
        denied_by: any;
        denial_reason: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=recommendation-store.d.ts.map