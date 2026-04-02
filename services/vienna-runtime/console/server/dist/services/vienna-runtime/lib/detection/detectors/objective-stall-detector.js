/**
 * Objective Stall Detector — Phase 15 Stage 2
 *
 * Detects objectives that haven't been evaluated within their interval.
 */
const { Detector } = require('../detector-framework.js');
const { AnomalyType, AnomalySeverity } = require('../../core/anomaly-schema.js');
class ObjectiveStallDetector extends Detector {
    constructor(stateGraph, config = {}) {
        super('ObjectiveStallDetector', config);
        this.stateGraph = stateGraph;
    }
    async detect() {
        const anomalies = [];
        // Query managed objectives (Phase 9)
        const objectives = this.stateGraph.query(`
      SELECT * FROM managed_objectives
      WHERE status IN ('monitoring', 'healthy')
      AND last_evaluated_at IS NOT NULL
    `);
        const now = Date.now();
        for (const objective of objectives) {
            const lastEval = new Date(objective.last_evaluated_at).getTime();
            const interval = objective.evaluation_interval * 1000; // seconds to ms
            const staleDuration = now - lastEval;
            // Stalled if missed 2+ evaluation windows
            if (staleDuration > interval * 2) {
                const severity = this.assessSeverity(staleDuration, interval);
                const confidence = 0.9; // High confidence for time-based detection
                const anomaly = this.createCandidate({
                    anomaly_type: AnomalyType.BEHAVIORAL,
                    severity,
                    entity_type: 'objective',
                    entity_id: objective.objective_id,
                    evidence: {
                        last_evaluated_at: objective.last_evaluated_at,
                        evaluation_interval: objective.evaluation_interval,
                        stalled_duration_seconds: Math.floor(staleDuration / 1000),
                        missed_windows: Math.floor(staleDuration / interval)
                    },
                    confidence
                });
                anomalies.push(anomaly);
            }
        }
        return anomalies;
    }
    assessSeverity(staleDuration, interval) {
        const missedWindows = staleDuration / interval;
        if (missedWindows > 10)
            return AnomalySeverity.CRITICAL;
        if (missedWindows > 5)
            return AnomalySeverity.HIGH;
        if (missedWindows > 3)
            return AnomalySeverity.MEDIUM;
        return AnomalySeverity.LOW;
    }
}
module.exports = ObjectiveStallDetector;
//# sourceMappingURL=objective-stall-detector.js.map