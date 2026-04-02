/**
 * Policy Recommender — Phase 18
 *
 * Generates policy improvement recommendations based on patterns:
 * - Constraint relaxation
 * - New policy suggestions
 * - Policy removal
 * - Priority adjustment
 */
const crypto = require('crypto');
/**
 * Recommendation Types
 */
const RecommendationType = {
    CONSTRAINT_RELAXATION: 'constraint_relaxation',
    NEW_POLICY: 'new_policy',
    POLICY_REMOVAL: 'policy_removal',
    PRIORITY_ADJUSTMENT: 'priority_adjustment'
};
/**
 * Policy Recommender
 */
class PolicyRecommender {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
    }
    /**
     * Generate constraint relaxation recommendations
     *
     * Pattern: Action repeatedly denied by same constraint
     * Recommendation: Relax constraint parameters
     */
    async recommendConstraintRelaxation(pattern, options = {}) {
        const { minConfidence = 0.75 } = options;
        if (pattern.pattern_type !== 'policy_conflict') {
            return null;
        }
        const metadata = pattern.metadata;
        const policy = await this.stateGraph.getPolicy(pattern.policy_id);
        if (!policy)
            return null;
        // Determine relaxation based on constraint type
        const currentConstraints = JSON.parse(policy.constraints || '{}');
        const proposedConstraints = { ...currentConstraints };
        if (metadata.constraint_type === 'rate_limit') {
            // Increase rate limit
            const current = currentConstraints.max_executions || 3;
            proposedConstraints.max_executions = Math.ceil(current * 1.5);
            proposedConstraints.window_ms = currentConstraints.window_ms;
        }
        else if (metadata.constraint_type === 'cooldown') {
            // Reduce cooldown duration
            const current = currentConstraints.cooldown_ms || 3600000;
            proposedConstraints.cooldown_ms = Math.floor(current * 0.75);
        }
        else if (metadata.constraint_type === 'time_window') {
            // Expand time window
            const current = currentConstraints.allowed_windows || [];
            // Add adjacent hours (simplified)
            proposedConstraints.allowed_windows = current;
            proposedConstraints._suggestion = 'Expand time window based on denial patterns';
        }
        else {
            // Generic relaxation
            proposedConstraints._relaxed = true;
        }
        return {
            recommendation_id: this._generateRecommendationId(pattern),
            recommendation_type: RecommendationType.CONSTRAINT_RELAXATION,
            target_policy_id: pattern.policy_id,
            proposed_change: {
                constraints: proposedConstraints
            },
            pattern_id: pattern.pattern_id,
            confidence: pattern.confidence,
            evidence: {
                observation_window_days: pattern.observation_window_days,
                event_count: pattern.event_count,
                supporting_events: metadata.evidence || []
            },
            auto_apply_eligible: pattern.confidence >= 0.9,
            requires_approval: true,
            created_at: new Date().toISOString()
        };
    }
    /**
     * Generate new policy recommendations
     *
     * Pattern: Remediation success varies by time/environment
     * Recommendation: Add policy to restrict to successful patterns
     */
    async recommendNewPolicy(pattern, options = {}) {
        const { minConfidence = 0.8 } = options;
        if (pattern.pattern_type !== 'remediation_effectiveness') {
            return null;
        }
        const metadata = pattern.metadata;
        // Check if success rate is extreme
        if (metadata.success_rate > 0.9 || metadata.success_rate < 0.3) {
            // High success rate might not need policy
            // Low success rate suggests need for restriction
            if (metadata.success_rate >= 0.5) {
                return null; // Don't create restrictive policy for decent success rate
            }
        }
        // Propose time-window restriction
        const proposedPolicy = {
            policy_name: `Restrict ${pattern.action_type} based on effectiveness pattern`,
            action_type: pattern.action_type,
            target_type: pattern.target_type,
            constraints: {
                time_window: {
                    // Suggest off-hours for low success rate actions
                    allowed_windows: [
                        { start: '00:00', end: '06:00' }
                    ],
                    timezone: 'UTC'
                }
            },
            priority: 50,
            enabled: true
        };
        return {
            recommendation_id: this._generateRecommendationId(pattern),
            recommendation_type: RecommendationType.NEW_POLICY,
            proposed_change: {
                new_policy: proposedPolicy
            },
            pattern_id: pattern.pattern_id,
            confidence: pattern.confidence * 0.9, // Slightly lower for new policy
            evidence: {
                observation_window_days: pattern.observation_window_days,
                event_count: pattern.event_count,
                success_rate: metadata.success_rate,
                supporting_events: metadata.evidence || []
            },
            auto_apply_eligible: false, // New policies require approval
            requires_approval: true,
            created_at: new Date().toISOString()
        };
    }
    /**
     * Generate policy removal recommendations
     *
     * Pattern: Policy never denies actions
     * Recommendation: Remove unnecessary policy
     */
    async recommendPolicyRemoval(policyId, options = {}) {
        const { lookbackDays = 30, minConfidence = 0.75 } = options;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
        // Check policy decisions
        const decisions = await this.stateGraph.listPolicyDecisions({
            policy_id: policyId,
            created_since: since,
            limit: 100
        });
        if (decisions.length === 0) {
            // Policy never evaluated
            return null;
        }
        const denials = decisions.filter(d => d.decision === 'deny');
        const denialRate = denials.length / decisions.length;
        // If policy never denies, consider removal
        if (denialRate === 0 && decisions.length >= 20) {
            const confidence = Math.min(0.7 + (decisions.length / 100) * 0.2, 0.95);
            return {
                recommendation_id: this._generateRecommendationId({ policy_id: policyId }),
                recommendation_type: RecommendationType.POLICY_REMOVAL,
                target_policy_id: policyId,
                proposed_change: {
                    action: 'remove_policy',
                    reason: 'Policy never denies actions'
                },
                pattern_id: null,
                confidence,
                evidence: {
                    observation_window_days: lookbackDays,
                    event_count: decisions.length,
                    denial_count: 0,
                    approval_count: decisions.length
                },
                auto_apply_eligible: confidence >= 0.9,
                requires_approval: true,
                created_at: new Date().toISOString()
            };
        }
        return null;
    }
    /**
     * Generate priority adjustment recommendations
     *
     * Pattern: Policy A blocks what Policy B would allow
     * Recommendation: Swap priorities
     */
    async recommendPriorityAdjustment(pattern, options = {}) {
        const { minConfidence = 0.8 } = options;
        // This requires analyzing policy conflicts
        // Simplified: detect if denials are later overridden
        const metadata = pattern.metadata;
        if (!metadata.evidence || metadata.evidence.length === 0) {
            return null;
        }
        // Check if denials were later approved manually (operator override)
        const overrides = [];
        for (const executionId of metadata.evidence.slice(0, 10)) {
            const approvals = await this.stateGraph.listApprovals({
                execution_id: executionId,
                limit: 5
            });
            const denied = approvals.find(a => a.status === 'denied');
            const approved = approvals.find(a => a.status === 'approved');
            if (denied && approved && new Date(approved.created_at) > new Date(denied.created_at)) {
                overrides.push(executionId);
            }
        }
        if (overrides.length >= 3) {
            return {
                recommendation_id: this._generateRecommendationId(pattern),
                recommendation_type: RecommendationType.PRIORITY_ADJUSTMENT,
                target_policy_id: pattern.policy_id,
                proposed_change: {
                    action: 'decrease_priority',
                    reason: 'Policy frequently overridden by operator',
                    suggested_priority: 100 // Lower priority
                },
                pattern_id: pattern.pattern_id,
                confidence: pattern.confidence * 0.85,
                evidence: {
                    observation_window_days: pattern.observation_window_days,
                    event_count: pattern.event_count,
                    override_count: overrides.length,
                    override_examples: overrides
                },
                auto_apply_eligible: false,
                requires_approval: true,
                created_at: new Date().toISOString()
            };
        }
        return null;
    }
    /**
     * Generate recommendations from pattern
     */
    async generateRecommendations(pattern, options = {}) {
        const recommendations = [];
        // Try each recommendation type
        if (pattern.pattern_type === 'policy_conflict') {
            const relaxation = await this.recommendConstraintRelaxation(pattern, options);
            if (relaxation)
                recommendations.push(relaxation);
            const priorityAdj = await this.recommendPriorityAdjustment(pattern, options);
            if (priorityAdj)
                recommendations.push(priorityAdj);
        }
        if (pattern.pattern_type === 'remediation_effectiveness') {
            const newPolicy = await this.recommendNewPolicy(pattern, options);
            if (newPolicy)
                recommendations.push(newPolicy);
        }
        return recommendations;
    }
    /**
     * Generate deterministic recommendation ID
     */
    _generateRecommendationId(data) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify({
            pattern_id: data.pattern_id,
            policy_id: data.policy_id || data.target_policy_id,
            timestamp: Date.now()
        }));
        return `rec_${hash.digest('hex').substring(0, 16)}`;
    }
}
module.exports = { PolicyRecommender, RecommendationType };
//# sourceMappingURL=policy-recommender.js.map