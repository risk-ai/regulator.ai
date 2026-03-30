/**
 * Pattern Detector — Phase 18
 *
 * Identifies recurring execution patterns:
 * - Failure clustering
 * - Policy conflict detection
 * - Remediation effectiveness tracking
 */
const crypto = require('crypto');
/**
 * Pattern Types
 */
const PatternType = {
    FAILURE_CLUSTER: 'failure_cluster',
    POLICY_CONFLICT: 'policy_conflict',
    REMEDIATION_EFFECTIVENESS: 'remediation_effectiveness'
};
/**
 * Pattern Detector
 */
class PatternDetector {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
    }
    /**
     * Detect failure clusters
     *
     * Groups similar failures by action_type, target_id, failure_reason
     */
    async detectFailureClusters(options = {}) {
        const { lookbackDays = 7, minOccurrences = 3, minConfidence = 0.7 } = options;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
        // Query execution ledger for failures
        const failures = await this.stateGraph.listExecutionLedgerSummaries({
            status: 'failed',
            created_since: since,
            limit: 1000
        });
        // Group by action_type + target_id + failure_reason
        const clusters = new Map();
        for (const failure of failures) {
            const metadata = JSON.parse(failure.metadata || '{}');
            const key = `${metadata.action_type}:${metadata.target_id}:${this._normalizeFailureReason(metadata.error)}`;
            if (!clusters.has(key)) {
                clusters.set(key, {
                    action_type: metadata.action_type,
                    target_id: metadata.target_id,
                    failure_reason: this._normalizeFailureReason(metadata.error),
                    occurrences: [],
                    event_count: 0
                });
            }
            const cluster = clusters.get(key);
            cluster.occurrences.push({
                execution_id: failure.execution_id,
                timestamp: failure.created_at,
                error: metadata.error
            });
            cluster.event_count++;
        }
        // Filter by min occurrences
        const patterns = [];
        for (const [key, cluster] of clusters.entries()) {
            if (cluster.event_count >= minOccurrences) {
                const confidence = this._calculateClusterConfidence(cluster, lookbackDays);
                if (confidence >= minConfidence) {
                    patterns.push({
                        pattern_id: this._generatePatternId(cluster),
                        pattern_type: PatternType.FAILURE_CLUSTER,
                        action_type: cluster.action_type,
                        target_id: cluster.target_id,
                        observation_window_days: lookbackDays,
                        event_count: cluster.event_count,
                        confidence,
                        metadata: {
                            failure_reason: cluster.failure_reason,
                            first_observed: cluster.occurrences[0].timestamp,
                            last_observed: cluster.occurrences[cluster.occurrences.length - 1].timestamp,
                            evidence: cluster.occurrences.map(o => o.execution_id)
                        }
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Detect policy conflicts
     *
     * Identifies policies that repeatedly block legitimate actions
     */
    async detectPolicyConflicts(options = {}) {
        const { lookbackDays = 14, minDenials = 5, minConfidence = 0.7 } = options;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
        // Query policy decisions
        const decisions = await this.stateGraph.listPolicyDecisions({
            decision: 'deny',
            created_since: since,
            limit: 1000
        });
        // Group by policy_id + constraint_type
        const conflicts = new Map();
        for (const decision of decisions) {
            const metadata = JSON.parse(decision.metadata || '{}');
            const key = `${decision.policy_id}:${metadata.failed_constraint_type}`;
            if (!conflicts.has(key)) {
                conflicts.set(key, {
                    policy_id: decision.policy_id,
                    constraint_type: metadata.failed_constraint_type,
                    denials: [],
                    event_count: 0
                });
            }
            const conflict = conflicts.get(key);
            conflict.denials.push({
                execution_id: metadata.execution_id,
                timestamp: decision.created_at,
                reason: metadata.failed_constraint_reason
            });
            conflict.event_count++;
        }
        // Filter by min denials
        const patterns = [];
        for (const [key, conflict] of conflicts.entries()) {
            if (conflict.event_count >= minDenials) {
                const confidence = this._calculateConflictConfidence(conflict, lookbackDays);
                if (confidence >= minConfidence) {
                    patterns.push({
                        pattern_id: this._generatePatternId(conflict),
                        pattern_type: PatternType.POLICY_CONFLICT,
                        policy_id: conflict.policy_id,
                        observation_window_days: lookbackDays,
                        event_count: conflict.event_count,
                        confidence,
                        metadata: {
                            constraint_type: conflict.constraint_type,
                            first_denial: conflict.denials[0].timestamp,
                            last_denial: conflict.denials[conflict.denials.length - 1].timestamp,
                            evidence: conflict.denials.map(d => d.execution_id)
                        }
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Detect remediation effectiveness patterns
     *
     * Tracks remediation success/failure rates
     */
    async detectRemediationEffectiveness(options = {}) {
        const { lookbackDays = 30, minExecutions = 10, minConfidence = 0.7 } = options;
        const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
        // Query workflow outcomes
        const outcomes = await this.stateGraph.listWorkflowOutcomes({
            created_since: since,
            limit: 1000
        });
        // Group by plan_template (if available) or action_type + target_type
        const effectiveness = new Map();
        for (const outcome of outcomes) {
            const metadata = JSON.parse(outcome.metadata || '{}');
            const key = metadata.plan_template || `${metadata.action_type}:${metadata.target_type}`;
            if (!effectiveness.has(key)) {
                effectiveness.set(key, {
                    plan_template: metadata.plan_template,
                    action_type: metadata.action_type,
                    target_type: metadata.target_type,
                    executions: [],
                    success_count: 0,
                    failure_count: 0,
                    event_count: 0
                });
            }
            const eff = effectiveness.get(key);
            eff.executions.push({
                execution_id: outcome.execution_id,
                timestamp: outcome.created_at,
                objective_achieved: outcome.objective_achieved
            });
            eff.event_count++;
            if (outcome.objective_achieved) {
                eff.success_count++;
            }
            else {
                eff.failure_count++;
            }
        }
        // Filter by min executions
        const patterns = [];
        for (const [key, eff] of effectiveness.entries()) {
            if (eff.event_count >= minExecutions) {
                const successRate = eff.success_count / eff.event_count;
                const confidence = this._calculateEffectivenessConfidence(eff, lookbackDays);
                if (confidence >= minConfidence) {
                    patterns.push({
                        pattern_id: this._generatePatternId(eff),
                        pattern_type: PatternType.REMEDIATION_EFFECTIVENESS,
                        action_type: eff.action_type,
                        target_type: eff.target_type,
                        observation_window_days: lookbackDays,
                        event_count: eff.event_count,
                        confidence,
                        metadata: {
                            plan_template: eff.plan_template,
                            success_count: eff.success_count,
                            failure_count: eff.failure_count,
                            success_rate: successRate,
                            first_execution: eff.executions[0].timestamp,
                            last_execution: eff.executions[eff.executions.length - 1].timestamp,
                            evidence: eff.executions.map(e => e.execution_id)
                        }
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Normalize failure reason for clustering
     */
    _normalizeFailureReason(error) {
        if (!error)
            return 'unknown';
        const lower = error.toLowerCase();
        // Common patterns
        if (lower.includes('timeout'))
            return 'timeout';
        if (lower.includes('connection refused'))
            return 'connection_refused';
        if (lower.includes('permission denied'))
            return 'permission_denied';
        if (lower.includes('not found') || lower.includes('404'))
            return 'not_found';
        if (lower.includes('service unavailable') || lower.includes('503'))
            return 'service_unavailable';
        if (lower.includes('internal server error') || lower.includes('500'))
            return 'internal_error';
        // Return first 50 chars
        return error.substring(0, 50);
    }
    /**
     * Calculate cluster confidence
     */
    _calculateClusterConfidence(cluster, lookbackDays) {
        const { event_count, occurrences } = cluster;
        // Base confidence from event count (start at 0.7 for min threshold of 3)
        let confidence = Math.min(0.7 + (event_count - 3) * 0.05, 0.95);
        // Increase confidence if failures are recent
        const hoursSinceLastOccurrence = (Date.now() - new Date(occurrences[occurrences.length - 1].timestamp).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastOccurrence < 24)
            confidence += 0.1;
        else if (hoursSinceLastOccurrence < 72)
            confidence += 0.05;
        // Increase confidence if failures are frequent
        const avgHoursBetweenFailures = (new Date(occurrences[occurrences.length - 1].timestamp).getTime() -
            new Date(occurrences[0].timestamp).getTime()) / (1000 * 60 * 60 * (event_count - 1));
        if (avgHoursBetweenFailures < 48)
            confidence += 0.05;
        return Math.min(confidence, 1.0);
    }
    /**
     * Calculate conflict confidence
     */
    _calculateConflictConfidence(conflict, lookbackDays) {
        const { event_count, denials } = conflict;
        // Base confidence from denial count (start at 0.7 for min threshold of 5)
        let confidence = Math.min(0.7 + (event_count - 5) * 0.04, 0.95);
        // Increase confidence if denials are recent
        const hoursSinceLastDenial = (Date.now() - new Date(denials[denials.length - 1].timestamp).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastDenial < 48)
            confidence += 0.1;
        else if (hoursSinceLastDenial < 168)
            confidence += 0.05; // within a week
        return Math.min(confidence, 1.0);
    }
    /**
     * Calculate effectiveness confidence
     */
    _calculateEffectivenessConfidence(eff, lookbackDays) {
        const { event_count, success_count } = eff;
        // Base confidence from sample size (start at 0.7 for min threshold of 10)
        let confidence = Math.min(0.7 + (event_count - 10) * 0.015, 0.9);
        // Increase confidence if success rate is extreme (very high or very low)
        const successRate = success_count / event_count;
        if (successRate > 0.9 || successRate < 0.3)
            confidence += 0.1;
        return Math.min(confidence, 1.0);
    }
    /**
     * Generate deterministic pattern ID
     */
    _generatePatternId(data) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify({
            pattern_type: data.pattern_type || PatternType.FAILURE_CLUSTER,
            action_type: data.action_type,
            target_id: data.target_id,
            target_type: data.target_type,
            policy_id: data.policy_id
        }));
        return `pat_${hash.digest('hex').substring(0, 16)}`;
    }
}
module.exports = { PatternDetector, PatternType };
//# sourceMappingURL=pattern-detector.js.map