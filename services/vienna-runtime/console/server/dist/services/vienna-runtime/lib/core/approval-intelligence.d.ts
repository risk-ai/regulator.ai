/**
 * Approval Intelligence Engine
 *
 * Groups approvals by risk, suggests grouping, manages expiry.
 */
export class ApprovalIntelligence {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Score approval by risk level
     *
     * @param {object} approval - Approval object
     * @returns {number} Risk score 0-1
     */
    scoreRisk(approval: object): number;
    /**
     * Group pending approvals by risk level
     *
     * @returns {object} Grouped approvals
     */
    groupApprovalsByRisk(): object;
    /**
     * Suggest approval batching
     *
     * Groups related approvals that can be reviewed together.
     *
     * @returns {object} Batch suggestions
     */
    suggestApprovalBatches(): object;
    /**
     * Get approval suggestions
     *
     * Recommends which approvals to handle first based on:
     * - Risk level
     * - Business impact
     * - Time sensitivity
     * - Grouping opportunity
     *
     * @returns {object} Suggestions
     */
    getApprovalSuggestions(): object;
    /**
     * Calculate approval priority
     *
     * Combines risk, urgency, and business impact.
     */
    calculatePriority(approval: any, risk: any): number;
    /**
     * Get recommended action for operator
     */
    getRecommendedAction(approval: any, risk: any, priority: any): "URGENT: Review immediately - critical risk" | "Priority: Review within 5 minutes" | "Normal: Review in batch with similar items" | "Low priority: Safe to defer or batch";
    /**
     * Get time until expiry
     */
    getTimeUntilExpiry(approval: any): number;
    /**
     * Summarize business impact
     */
    summarizeImpact(approval: any): string[];
    /**
     * Get operator summary action
     */
    getOperatorAction(suggestions: any): string;
    /**
     * Set auto-expiry policy
     *
     * Automatically expires low-risk approvals after inactivity.
     */
    setAutoExpiryPolicy(policy: any): Promise<{
        policy_id: string;
        risk_threshold: any;
        inactivity_ms: any;
        auto_deny: any;
        created_at: string;
        status: string;
    }>;
    /**
     * Apply auto-expiry policy
     */
    applyAutoExpiryPolicy(policyId: any): Promise<{
        policy_id: any;
        processed: number;
        actions: {
            approval_id: any;
            action: string;
            reason: string;
            policy_id: any;
        }[];
    }>;
    /**
     * Bulk approve similar items
     *
     * Approves multiple low-risk items with single operator action.
     */
    bulkApproveByPattern(pattern: any, reviewedBy: any): Promise<{
        pattern: any;
        approved_count: number;
        approved_ids: any[];
        timestamp: string;
    }>;
    /**
     * Recommend follow-up actions based on approval patterns
     */
    getFollowUpRecommendations(): Promise<{
        recommendations: ({
            type: string;
            operator: any;
            count: any;
            recommendation: string;
            action: string;
            expired_count?: undefined;
        } | {
            type: string;
            expired_count: any;
            recommendation: string;
            action: string;
            operator?: undefined;
            count?: undefined;
        })[];
        summary: string;
    }>;
}
export namespace RiskScore {
    let LOW: number;
    let MEDIUM: number;
    let HIGH: number;
    let CRITICAL: number;
}
//# sourceMappingURL=approval-intelligence.d.ts.map