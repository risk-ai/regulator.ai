/**
 * Policy Denial Detector — Phase 15 Stage 2
 * 
 * Detects repeated policy denials suggesting misconfiguration.
 */

const { Detector } = require('../detector-framework.js');
const { AnomalyType, AnomalySeverity } = require('../../core/anomaly-schema.js');

class PolicyDenialDetector extends Detector {
  constructor(stateGraph, config = {}) {
    super('PolicyDenialDetector', {
      lookback_minutes: 30,
      denial_threshold: 3,
      ...config
    });
    this.stateGraph = stateGraph;
  }

  async detect() {
    const anomalies = [];
    
    const lookbackTime = new Date(Date.now() - this.config.lookback_minutes * 60000).toISOString();
    
    // Query policy denials
    const denials = this.stateGraph.query(`
      SELECT * FROM policy_decisions
      WHERE decision = 'deny'
      AND created_at >= ?
      ORDER BY created_at DESC
    `, [lookbackTime]);
    
    // Group by policy_id
    const denialsByPolicy = {};
    for (const denial of denials) {
      const policyId = denial.policy_id;
      if (!denialsByPolicy[policyId]) {
        denialsByPolicy[policyId] = [];
      }
      denialsByPolicy[policyId].push(denial);
    }
    
    // Detect repeated denials
    for (const [policyId, denials] of Object.entries(denialsByPolicy)) {
      if (denials.length >= this.config.denial_threshold) {
        const severity = this.assessSeverity(denials.length);
        const confidence = 0.8;
        
        // Extract unique targets
        const targets = [...new Set(denials.map(d => d.target_id).filter(Boolean))];
        
        const anomaly = this.createCandidate({
          anomaly_type: AnomalyType.POLICY,
          severity,
          entity_type: 'policy',
          entity_id: policyId,
          evidence: {
            denial_count: denials.length,
            time_window_minutes: this.config.lookback_minutes,
            affected_targets: targets,
            first_denial: denials[denials.length - 1].created_at,
            last_denial: denials[0].created_at,
            sample_reasons: denials.slice(0, 3).map(d => d.reason)
          },
          confidence
        });
        
        anomalies.push(anomaly);
      }
    }
    
    return anomalies;
  }

  assessSeverity(denialCount) {
    if (denialCount >= 10) return AnomalySeverity.HIGH;
    if (denialCount >= 6) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }
}

module.exports = PolicyDenialDetector;
