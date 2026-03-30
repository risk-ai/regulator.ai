/**
 * Service Health Detector — Phase 15 Stage 2
 *
 * Detects unhealthy services by querying State Graph.
 */
const { Detector } = require('../detector-framework.js');
const { AnomalyType, AnomalySeverity } = require('../../core/anomaly-schema.js');
class ServiceHealthDetector extends Detector {
    constructor(stateGraph, config = {}) {
        super('ServiceHealthDetector', config);
        this.stateGraph = stateGraph;
    }
    async detect() {
        const anomalies = [];
        // Query all services
        const services = this.stateGraph.listServices();
        for (const service of services) {
            // Check for unhealthy status
            if (service.status !== 'healthy' && service.status !== 'unknown') {
                const severity = this.assessSeverity(service);
                const confidence = this.assessConfidence(service);
                const anomaly = this.createCandidate({
                    anomaly_type: AnomalyType.STATE,
                    severity,
                    entity_type: 'service',
                    entity_id: service.service_id,
                    evidence: {
                        status: service.status,
                        last_check: service.updated_at,
                        health_data: service.health || {}
                    },
                    confidence
                });
                anomalies.push(anomaly);
            }
        }
        return anomalies;
    }
    assessSeverity(service) {
        if (service.status === 'failed')
            return AnomalySeverity.CRITICAL;
        if (service.status === 'degraded')
            return AnomalySeverity.HIGH;
        if (service.status === 'starting')
            return AnomalySeverity.LOW;
        return AnomalySeverity.MEDIUM;
    }
    assessConfidence(service) {
        // High confidence if recently checked
        if (service.updated_at) {
            const age = Date.now() - new Date(service.updated_at).getTime();
            if (age < 60000)
                return 0.95; // < 1 minute
            if (age < 300000)
                return 0.85; // < 5 minutes
            if (age < 900000)
                return 0.75; // < 15 minutes
        }
        return 0.6; // Stale data = lower confidence
    }
}
module.exports = ServiceHealthDetector;
//# sourceMappingURL=service-health-detector.js.map