/**
 * Verification Overdue Detector — Phase 15 Stage 2
 *
 * Detects verifications that are overdue (exceeded timeout).
 */
const { Detector } = require('../detector-framework.js');
const { AnomalyType, AnomalySeverity } = require('../../core/anomaly-schema.js');
class VerificationOverdueDetector extends Detector {
    constructor(stateGraph, config = {}) {
        super('VerificationOverdueDetector', config);
        this.stateGraph = stateGraph;
    }
    async detect() {
        const anomalies = [];
        // Query pending verifications
        const verifications = this.stateGraph.query(`
      SELECT v.*, p.created_at as plan_created_at
      FROM verifications v
      JOIN plans p ON v.plan_id = p.plan_id
      WHERE v.status = 'pending'
    `);
        const now = Date.now();
        for (const verification of verifications) {
            const createdAt = new Date(verification.created_at).getTime();
            const timeout = verification.timeout_seconds * 1000;
            const age = now - createdAt;
            // Overdue if age exceeds timeout
            if (age > timeout) {
                const overdueSeconds = Math.floor((age - timeout) / 1000);
                const severity = this.assessSeverity(overdueSeconds, timeout);
                const confidence = 0.95; // High confidence for time-based
                const anomaly = this.createCandidate({
                    anomaly_type: AnomalyType.TEMPORAL,
                    severity,
                    entity_type: 'verification',
                    entity_id: verification.verification_id,
                    evidence: {
                        verification_id: verification.verification_id,
                        plan_id: verification.plan_id,
                        created_at: verification.created_at,
                        timeout_seconds: verification.timeout_seconds,
                        overdue_seconds: overdueSeconds,
                        age_seconds: Math.floor(age / 1000)
                    },
                    confidence
                });
                anomalies.push(anomaly);
            }
        }
        return anomalies;
    }
    assessSeverity(overdueSeconds, timeoutMs) {
        const overdueRatio = overdueSeconds / (timeoutMs / 1000);
        if (overdueRatio > 3)
            return AnomalySeverity.CRITICAL; // 3x over
        if (overdueRatio > 2)
            return AnomalySeverity.HIGH; // 2x over
        if (overdueRatio > 1)
            return AnomalySeverity.MEDIUM; // 1x over
        return AnomalySeverity.LOW;
    }
}
module.exports = VerificationOverdueDetector;
//# sourceMappingURL=verification-overdue-detector.js.map