/**
 * Execution Failure Detector — Phase 15 Stage 2
 *
 * Detects repeated execution failures within time window.
 */
const { Detector } = require('../detector-framework.js');
const { AnomalyType, AnomalySeverity } = require('../../core/anomaly-schema.js');
class ExecutionFailureDetector extends Detector {
    constructor(stateGraph, config = {}) {
        super('ExecutionFailureDetector', {
            lookback_minutes: 60,
            failure_threshold: 3,
            ...config
        });
        this.stateGraph = stateGraph;
    }
    async detect() {
        const anomalies = [];
        const lookbackTime = new Date(Date.now() - this.config.lookback_minutes * 60000).toISOString();
        // Query failed executions from ledger
        const failures = this.stateGraph.listExecutionLedger({
            status: 'failed',
            created_after: lookbackTime
        });
        // Group by target_id
        const failuresByTarget = {};
        for (const failure of failures) {
            const targetId = failure.target_id || 'unknown';
            if (!failuresByTarget[targetId]) {
                failuresByTarget[targetId] = [];
            }
            failuresByTarget[targetId].push(failure);
        }
        // Detect repeated failures
        for (const [targetId, failures] of Object.entries(failuresByTarget)) {
            if (failures.length >= this.config.failure_threshold) {
                const severity = this.assessSeverity(failures.length);
                const confidence = 0.85;
                const anomaly = this.createCandidate({
                    anomaly_type: AnomalyType.BEHAVIORAL,
                    severity,
                    entity_type: 'execution',
                    entity_id: targetId,
                    evidence: {
                        failure_count: failures.length,
                        time_window_minutes: this.config.lookback_minutes,
                        first_failure: failures[0].created_at,
                        last_failure: failures[failures.length - 1].created_at,
                        execution_ids: failures.map(f => f.execution_id).slice(0, 5) // Sample
                    },
                    confidence
                });
                anomalies.push(anomaly);
            }
        }
        return anomalies;
    }
    assessSeverity(failureCount) {
        if (failureCount >= 10)
            return AnomalySeverity.CRITICAL;
        if (failureCount >= 7)
            return AnomalySeverity.HIGH;
        if (failureCount >= 5)
            return AnomalySeverity.MEDIUM;
        return AnomalySeverity.LOW;
    }
}
module.exports = ExecutionFailureDetector;
//# sourceMappingURL=execution-failure-detector.js.map