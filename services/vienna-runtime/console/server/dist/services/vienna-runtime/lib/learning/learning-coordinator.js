/**
 * Learning Coordinator — Phase 18
 *
 * Orchestrates learning loop:
 * - Observation phase (continuous)
 * - Analysis phase (every 6 hours)
 * - Recommendation phase (every 12 hours)
 * - Application phase (gated)
 */
const { PatternDetector } = require('./pattern-detector');
const { PolicyRecommender } = require('./policy-recommender');
const PlanOptimizer = require('./plan-optimizer');
const FeedbackIntegrator = require('./feedback-integrator');
/**
 * Learning Phases
 */
const LearningPhase = {
    OBSERVATION: 'observation',
    ANALYSIS: 'analysis',
    RECOMMENDATION: 'recommendation',
    APPLICATION: 'application'
};
/**
 * Learning Coordinator
 */
class LearningCoordinator {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
        this.patternDetector = new PatternDetector(stateGraph);
        this.policyRecommender = new PolicyRecommender(stateGraph);
        this.planOptimizer = new PlanOptimizer(stateGraph);
        this.feedbackIntegrator = new FeedbackIntegrator(stateGraph);
        this.lastAnalysisAt = null;
        this.lastRecommendationAt = null;
        this.isRunning = false;
    }
    /**
     * Start learning loop
     */
    start(options = {}) {
        if (this.isRunning) {
            throw new Error('Learning coordinator already running');
        }
        this.isRunning = true;
        const { analysisIntervalMs = 6 * 60 * 60 * 1000, // 6 hours
        recommendationIntervalMs = 12 * 60 * 60 * 1000 // 12 hours
         } = options;
        // Schedule analysis phase
        this.analysisInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.runAnalysisPhase();
            }
        }, analysisIntervalMs);
        // Schedule recommendation phase
        this.recommendationInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.runRecommendationPhase();
            }
        }, recommendationIntervalMs);
        // Run initial analysis
        this.runAnalysisPhase().catch(err => {
            console.error('Initial analysis phase failed:', err);
        });
    }
    /**
     * Stop learning loop
     */
    stop() {
        this.isRunning = false;
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
        if (this.recommendationInterval) {
            clearInterval(this.recommendationInterval);
            this.recommendationInterval = null;
        }
    }
    /**
     * Record execution for pattern detection (called from plan-execution-engine)
     */
    async recordExecution(executionData) {
        // Store in execution history for pattern detection
        if (this.stateGraph && this.stateGraph.appendLedgerEvent) {
            await this.stateGraph.appendLedgerEvent({
                execution_id: executionData.execution_id,
                event_type: 'learning_execution_recorded',
                stage: 'learning',
                event_timestamp: executionData.timestamp,
                payload_json: executionData
            });
        }
    }
    /**
     * Run observation phase
     *
     * Continuous: patterns detected from live execution data
     */
    async runObservationPhase(options = {}) {
        // Observation is implicit - execution ledger continuously records events
        // Pattern detection happens during analysis phase
        return { phase: LearningPhase.OBSERVATION, status: 'continuous' };
    }
    /**
     * Run analysis phase
     *
     * Every 6 hours: detect patterns, filter by confidence
     */
    async runAnalysisPhase(options = {}) {
        const { minConfidence = 0.7 } = options;
        const startTime = Date.now();
        // Detect all pattern types
        const [failureClusters, policyConflicts, remediationEffectiveness] = await Promise.all([
            this.patternDetector.detectFailureClusters({ minConfidence }),
            this.patternDetector.detectPolicyConflicts({ minConfidence }),
            this.patternDetector.detectRemediationEffectiveness({ minConfidence })
        ]);
        const allPatterns = [
            ...failureClusters,
            ...policyConflicts,
            ...remediationEffectiveness
        ];
        // Store high-confidence patterns
        const storedPatterns = [];
        for (const pattern of allPatterns) {
            if (pattern.confidence >= minConfidence) {
                await this._storePattern(pattern);
                storedPatterns.push(pattern.pattern_id);
            }
        }
        this.lastAnalysisAt = new Date().toISOString();
        return {
            phase: LearningPhase.ANALYSIS,
            patterns_detected: allPatterns.length,
            patterns_stored: storedPatterns.length,
            pattern_types: {
                failure_clusters: failureClusters.length,
                policy_conflicts: policyConflicts.length,
                remediation_effectiveness: remediationEffectiveness.length
            },
            duration_ms: Date.now() - startTime,
            completed_at: this.lastAnalysisAt
        };
    }
    /**
     * Run recommendation phase
     *
     * Every 12 hours: generate recommendations from patterns
     */
    async runRecommendationPhase(options = {}) {
        const { minConfidence = 0.75 } = options;
        const startTime = Date.now();
        // Load active patterns
        const patterns = await this._loadActivePatterns({ minConfidence });
        // Generate recommendations
        const recommendations = [];
        for (const pattern of patterns) {
            const recs = await this.policyRecommender.generateRecommendations(pattern, { minConfidence });
            recommendations.push(...recs);
        }
        // Store recommendations
        const storedRecommendations = [];
        for (const rec of recommendations) {
            await this._storeRecommendation(rec);
            storedRecommendations.push(rec.recommendation_id);
        }
        this.lastRecommendationAt = new Date().toISOString();
        return {
            phase: LearningPhase.RECOMMENDATION,
            patterns_analyzed: patterns.length,
            recommendations_generated: recommendations.length,
            recommendations_stored: storedRecommendations.length,
            recommendation_types: this._countRecommendationTypes(recommendations),
            duration_ms: Date.now() - startTime,
            completed_at: this.lastRecommendationAt
        };
    }
    /**
     * Run application phase
     *
     * Gated: auto-apply or await operator approval
     */
    async runApplicationPhase(options = {}) {
        const { dryRun = false, maxAutoApply = 3 } = options;
        const startTime = Date.now();
        // Load pending recommendations
        const pending = await this._loadPendingRecommendations();
        // Filter auto-apply eligible
        const autoApplyEligible = pending.filter(r => r.auto_apply_eligible && r.confidence >= 0.9).slice(0, maxAutoApply);
        const applied = [];
        const requiresApproval = [];
        for (const rec of pending) {
            if (autoApplyEligible.includes(rec) && !dryRun) {
                // Auto-apply
                const result = await this._applyRecommendation(rec);
                applied.push({ recommendation_id: rec.recommendation_id, result });
            }
            else {
                // Requires approval
                requiresApproval.push(rec.recommendation_id);
            }
        }
        return {
            phase: LearningPhase.APPLICATION,
            pending_count: pending.length,
            auto_applied: applied.length,
            requires_approval: requiresApproval.length,
            dry_run: dryRun,
            applied_recommendations: applied,
            duration_ms: Date.now() - startTime
        };
    }
    /**
     * Get learning status
     */
    getStatus() {
        return {
            is_running: this.isRunning,
            last_analysis_at: this.lastAnalysisAt,
            last_recommendation_at: this.lastRecommendationAt,
            next_analysis_in_ms: this._getTimeUntilNextRun(this.analysisInterval),
            next_recommendation_in_ms: this._getTimeUntilNextRun(this.recommendationInterval)
        };
    }
    /**
     * Store pattern
     */
    async _storePattern(pattern) {
        await this.stateGraph.query(`INSERT OR REPLACE INTO learning_patterns (
        pattern_id, pattern_type, action_type, target_id,
        observation_window_days, event_count, confidence,
        metadata, created_at, last_observed_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            pattern.pattern_id,
            pattern.pattern_type,
            pattern.action_type,
            pattern.target_id,
            pattern.observation_window_days,
            pattern.event_count,
            pattern.confidence,
            JSON.stringify(pattern.metadata || {}),
            new Date().toISOString(),
            new Date().toISOString(),
            'active'
        ]);
    }
    /**
     * Load active patterns
     */
    async _loadActivePatterns(options = {}) {
        const { minConfidence = 0.7 } = options;
        const rows = await this.stateGraph.query(`SELECT * FROM learning_patterns 
       WHERE status = 'active' AND confidence >= ?
       ORDER BY confidence DESC`, [minConfidence]);
        return rows.map(row => ({
            pattern_id: row.pattern_id,
            pattern_type: row.pattern_type,
            action_type: row.action_type,
            target_id: row.target_id,
            observation_window_days: row.observation_window_days,
            event_count: row.event_count,
            confidence: row.confidence,
            metadata: JSON.parse(row.metadata || '{}'),
            created_at: row.created_at,
            last_observed_at: row.last_observed_at
        }));
    }
    /**
     * Store recommendation
     */
    async _storeRecommendation(recommendation) {
        await this.stateGraph.query(`INSERT OR REPLACE INTO learning_recommendations (
        recommendation_id, recommendation_type, target_policy_id,
        proposed_change, pattern_id, confidence, evidence,
        auto_apply_eligible, requires_approval, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            recommendation.recommendation_id,
            recommendation.recommendation_type,
            recommendation.target_policy_id,
            JSON.stringify(recommendation.proposed_change || {}),
            recommendation.pattern_id,
            recommendation.confidence,
            JSON.stringify(recommendation.evidence || {}),
            recommendation.auto_apply_eligible ? 1 : 0,
            recommendation.requires_approval ? 1 : 0,
            'pending',
            recommendation.created_at
        ]);
    }
    /**
     * Load pending recommendations
     */
    async _loadPendingRecommendations() {
        const rows = await this.stateGraph.query(`SELECT * FROM learning_recommendations 
       WHERE status = 'pending'
       ORDER BY confidence DESC`);
        return rows.map(row => ({
            recommendation_id: row.recommendation_id,
            recommendation_type: row.recommendation_type,
            target_policy_id: row.target_policy_id,
            proposed_change: JSON.parse(row.proposed_change || '{}'),
            pattern_id: row.pattern_id,
            confidence: row.confidence,
            evidence: JSON.parse(row.evidence || '{}'),
            auto_apply_eligible: row.auto_apply_eligible === 1,
            requires_approval: row.requires_approval === 1,
            created_at: row.created_at
        }));
    }
    /**
     * Apply recommendation
     */
    async _applyRecommendation(recommendation) {
        // Record in learning history
        const historyId = `hist_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await this.stateGraph.query(`INSERT INTO learning_history (
        history_id, recommendation_id, action, reason, operator, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            historyId,
            recommendation.recommendation_id,
            'applied',
            'Auto-applied by learning coordinator',
            'system',
            new Date().toISOString(),
            JSON.stringify({ auto_applied: true })
        ]);
        // Update recommendation status
        await this.stateGraph.query(`UPDATE learning_recommendations 
       SET status = 'applied', applied_at = ?
       WHERE recommendation_id = ?`, [new Date().toISOString(), recommendation.recommendation_id]);
        // TODO: Actually apply the policy change (Phase 18.1)
        return { status: 'applied', history_id: historyId };
    }
    /**
     * Count recommendation types
     */
    _countRecommendationTypes(recommendations) {
        const counts = {};
        for (const rec of recommendations) {
            counts[rec.recommendation_type] = (counts[rec.recommendation_type] || 0) + 1;
        }
        return counts;
    }
    /**
     * Get time until next scheduled run
     */
    _getTimeUntilNextRun(interval) {
        if (!interval || !interval._idleStart) {
            return null;
        }
        const elapsed = Date.now() - interval._idleStart;
        const remaining = interval._idleTimeout - elapsed;
        return Math.max(0, remaining);
    }
}
module.exports = { LearningCoordinator, LearningPhase };
//# sourceMappingURL=learning-coordinator.js.map