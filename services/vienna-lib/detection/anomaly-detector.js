/**
 * Agent Behavior Anomaly Detector
 * 
 * Statistical anomaly detector for agent behavior patterns.
 * Maintains per-agent baselines and detects deviations using z-score analysis.
 * 
 * Detects:
 * - Velocity anomaly: Sudden increase in intent submission rate  
 * - Scope anomaly: Actions outside historical pattern
 * - Error spike: Significant increase in error rate
 * - Time anomaly: Activity at unusual hours
 * - Pattern break: Dramatic change in action distribution
 */

const { Detector } = require('./detector-framework');
const { AnomalyType, AnomalySeverity, createAnomaly } = require('../core/anomaly-schema');

/**
 * Agent Behavior Baseline
 */
class AgentBaseline {
  constructor(agentId) {
    this.agent_id = agentId;
    this.created_at = new Date().toISOString();
    this.last_updated = new Date().toISOString();
    
    // Behavioral metrics with statistical tracking
    this.metrics = {
      // Velocity: intents per hour
      velocity: {
        mean: 0,
        std_dev: 0,
        values: [], // Recent samples for rolling calculation
        max_samples: 168 // One week of hourly data
      },
      
      // Error rate: percentage of failed intents
      error_rate: {
        mean: 0,
        std_dev: 0,
        values: [],
        max_samples: 100
      },
      
      // Response latency: time from intent to completion (ms)
      latency: {
        mean: 0,
        std_dev: 0,
        values: [],
        max_samples: 100
      },
      
      // Action diversity: unique action types used
      action_diversity: {
        mean: 0,
        std_dev: 0,
        values: [],
        max_samples: 50
      }
    };
    
    // Action pattern tracking
    this.action_patterns = new Map(); // action_type -> frequency
    this.active_hours = new Map();   // hour -> activity_count
    this.last_actions = [];          // Recent actions for pattern analysis
  }

  /**
   * Update baseline with new observation
   */
  updateMetric(metricName, value) {
    const metric = this.metrics[metricName];
    if (!metric) return;

    // Add new value
    metric.values.push(value);
    
    // Maintain rolling window
    if (metric.values.length > metric.max_samples) {
      metric.values.shift();
    }
    
    // Recalculate statistics
    this._recalculateStats(metric);
    this.last_updated = new Date().toISOString();
  }

  /**
   * Update action pattern tracking
   */
  updateActionPattern(actionType, hour) {
    // Track action type frequency
    this.action_patterns.set(
      actionType,
      (this.action_patterns.get(actionType) || 0) + 1
    );
    
    // Track hourly activity
    this.active_hours.set(
      hour,
      (this.active_hours.get(hour) || 0) + 1
    );
    
    // Maintain recent actions list
    this.last_actions.push({
      action_type: actionType,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 actions for pattern analysis
    if (this.last_actions.length > 100) {
      this.last_actions.shift();
    }
  }

  /**
   * Calculate z-score for a metric
   */
  calculateZScore(metricName, value) {
    const metric = this.metrics[metricName];
    if (!metric || metric.std_dev === 0) {
      return 0; // No deviation when no variance
    }
    
    return Math.abs((value - metric.mean) / metric.std_dev);
  }

  /**
   * Get action distribution as percentages
   */
  getActionDistribution() {
    const total = Array.from(this.action_patterns.values())
      .reduce((sum, count) => sum + count, 0);
      
    if (total === 0) return new Map();
    
    const distribution = new Map();
    for (const [action, count] of this.action_patterns) {
      distribution.set(action, (count / total) * 100);
    }
    
    return distribution;
  }

  /**
   * Get typical active hours (hours with >5% of activity)
   */
  getTypicalHours() {
    const total = Array.from(this.active_hours.values())
      .reduce((sum, count) => sum + count, 0);
      
    if (total === 0) return new Set();
    
    const typical = new Set();
    for (const [hour, count] of this.active_hours) {
      if ((count / total) > 0.05) { // More than 5% of activity
        typical.add(hour);
      }
    }
    
    return typical;
  }

  /**
   * Recalculate mean and standard deviation for a metric
   */
  _recalculateStats(metric) {
    if (metric.values.length === 0) return;
    
    // Calculate mean
    metric.mean = metric.values.reduce((sum, val) => sum + val, 0) / metric.values.length;
    
    // Calculate standard deviation
    if (metric.values.length < 2) {
      metric.std_dev = 0;
      return;
    }
    
    const variance = metric.values.reduce((sum, val) => {
      return sum + Math.pow(val - metric.mean, 2);
    }, 0) / (metric.values.length - 1);
    
    metric.std_dev = Math.sqrt(variance);
  }
}

/**
 * Agent Behavior Anomaly Detector
 */
class AgentAnomalyDetector extends Detector {
  constructor(stateGraph, config = {}) {
    super('AgentAnomalyDetector', {
      z_score_threshold: 2.0,  // Standard deviations before flagging
      min_samples: 10,         // Minimum samples before anomaly detection
      velocity_multiplier: 5,  // 5x normal rate triggers velocity anomaly
      error_spike_threshold: 0.3, // 30% error rate threshold
      pattern_change_threshold: 0.4, // 40% change in action distribution
      ...config
    });
    
    this.stateGraph = stateGraph;
    this.baselines = new Map(); // agent_id -> AgentBaseline
    this.trust_adjustments = new Map(); // agent_id -> trust_delta
  }

  /**
   * Main detection method
   */
  async detect() {
    await this._updateBaselines();
    
    const anomalies = [];
    
    // Run detection for each agent
    for (const [agentId, baseline] of this.baselines) {
      try {
        const agentAnomalies = await this._detectAgentAnomalies(agentId, baseline);
        anomalies.push(...agentAnomalies);
      } catch (error) {
        console.error(`[AgentAnomalyDetector] Detection failed for agent ${agentId}:`, error);
      }
    }
    
    // Apply trust score adjustments
    this._adjustTrustScores();
    
    return anomalies;
  }

  /**
   * Update baselines with recent agent activity
   */
  async _updateBaselines() {
    await this.stateGraph.initialize();
    
    // Get recent intent traces (last 24 hours)
    const recentIntents = this.stateGraph.query(`
      SELECT 
        json_extract(source, '$.id') as agent_id,
        intent_type,
        submitted_at,
        status,
        events
      FROM intent_traces 
      WHERE submitted_at > datetime('now', '-24 hours')
      AND json_extract(source, '$.type') = 'agent'
    `);
    
    // Process each intent to update baselines
    for (const intent of recentIntents) {
      if (!intent.agent_id) continue;
      
      const baseline = this._getOrCreateBaseline(intent.agent_id);
      this._processIntentForBaseline(baseline, intent);
    }
  }

  /**
   * Get or create baseline for agent
   */
  _getOrCreateBaseline(agentId) {
    if (!this.baselines.has(agentId)) {
      this.baselines.set(agentId, new AgentBaseline(agentId));
    }
    return this.baselines.get(agentId);
  }

  /**
   * Process single intent for baseline updates
   */
  _processIntentForBaseline(baseline, intent) {
    const hour = new Date(intent.submitted_at).getHours();
    const events = JSON.parse(intent.events || '[]');
    
    // Calculate metrics from intent lifecycle
    const completedAt = events.find(e => e.stage === 'completed')?.timestamp;
    const failedAt = events.find(e => e.stage === 'failed')?.timestamp;
    
    // Update action pattern
    baseline.updateActionPattern(intent.intent_type, hour);
    
    // Update latency if completed
    if (completedAt) {
      const latency = new Date(completedAt).getTime() - new Date(intent.submitted_at).getTime();
      baseline.updateMetric('latency', latency);
    }
    
    // Track error rate
    const isError = intent.status === 'failed' || failedAt;
    baseline.updateMetric('error_rate', isError ? 1 : 0);
  }

  /**
   * Detect anomalies for specific agent
   */
  async _detectAgentAnomalies(agentId, baseline) {
    const anomalies = [];
    
    // Calculate current activity metrics
    const currentMetrics = await this._calculateCurrentMetrics(agentId);
    
    // 1. Velocity Anomaly: Sudden increase in intent submission rate
    const velocityAnomaly = this._detectVelocityAnomaly(agentId, baseline, currentMetrics);
    if (velocityAnomaly) anomalies.push(velocityAnomaly);
    
    // 2. Scope Anomaly: Actions outside historical pattern
    const scopeAnomaly = this._detectScopeAnomaly(agentId, baseline, currentMetrics);
    if (scopeAnomaly) anomalies.push(scopeAnomaly);
    
    // 3. Error Spike: Significant increase in error rate
    const errorAnomaly = this._detectErrorSpike(agentId, baseline, currentMetrics);
    if (errorAnomaly) anomalies.push(errorAnomaly);
    
    // 4. Time Anomaly: Activity at unusual hours
    const timeAnomaly = this._detectTimeAnomaly(agentId, baseline, currentMetrics);
    if (timeAnomaly) anomalies.push(timeAnomaly);
    
    // 5. Pattern Break: Dramatic change in action distribution
    const patternAnomaly = this._detectPatternBreak(agentId, baseline, currentMetrics);
    if (patternAnomaly) anomalies.push(patternAnomaly);
    
    return anomalies;
  }

  /**
   * Calculate current metrics for agent (last hour)
   */
  async _calculateCurrentMetrics(agentId) {
    const recentIntents = this.stateGraph.query(`
      SELECT 
        intent_type,
        submitted_at,
        status,
        events
      FROM intent_traces 
      WHERE json_extract(source, '$.id') = ?
      AND submitted_at > datetime('now', '-1 hour')
    `, [agentId]);

    const metrics = {
      velocity: recentIntents.length, // intents in last hour
      error_rate: 0,
      action_types: new Set(),
      active_hours: new Set(),
      recent_actions: []
    };

    for (const intent of recentIntents) {
      metrics.action_types.add(intent.intent_type);
      metrics.active_hours.add(new Date(intent.submitted_at).getHours());
      metrics.recent_actions.push(intent.intent_type);
      
      if (intent.status === 'failed') {
        metrics.error_rate += 1;
      }
    }

    if (recentIntents.length > 0) {
      metrics.error_rate = metrics.error_rate / recentIntents.length;
    }

    metrics.action_diversity = metrics.action_types.size;
    
    return metrics;
  }

  /**
   * Detect velocity anomaly (sudden increase in activity)
   */
  _detectVelocityAnomaly(agentId, baseline, currentMetrics) {
    // Need sufficient baseline data
    if (baseline.metrics.velocity.values.length < this.config.min_samples) {
      return null;
    }

    const zScore = baseline.calculateZScore('velocity', currentMetrics.velocity);
    const isVelocitySpike = currentMetrics.velocity >= (baseline.metrics.velocity.mean * this.config.velocity_multiplier);
    
    if (zScore >= this.config.z_score_threshold || isVelocitySpike) {
      const severity = this._calculateSeverity(zScore, 2.0, 3.0);
      
      return createAnomaly({
        anomaly_type: AnomalyType.BEHAVIORAL,
        severity,
        source: this.name,
        entity_type: 'agent',
        entity_id: agentId,
        evidence: {
          anomaly_subtype: 'velocity',
          current_velocity: currentMetrics.velocity,
          baseline_mean: baseline.metrics.velocity.mean,
          baseline_std: baseline.metrics.velocity.std_dev,
          z_score: zScore,
          multiplier: currentMetrics.velocity / (baseline.metrics.velocity.mean || 1)
        },
        confidence: Math.min(0.9, 0.5 + (zScore / 6)), // Higher z-score = higher confidence
        suggested_action: severity === 'critical' ? 'immediate_review' : 'monitor_closely'
      });
    }

    return null;
  }

  /**
   * Detect scope anomaly (new action types)
   */
  _detectScopeAnomaly(agentId, baseline, currentMetrics) {
    const historicalActions = new Set(baseline.action_patterns.keys());
    const newActions = [];
    
    for (const actionType of currentMetrics.action_types) {
      if (!historicalActions.has(actionType)) {
        newActions.push(actionType);
      }
    }

    if (newActions.length > 0) {
      const severity = newActions.length > 3 ? 'high' : 'medium';
      
      return createAnomaly({
        anomaly_type: AnomalyType.BEHAVIORAL,
        severity,
        source: this.name,
        entity_type: 'agent',
        entity_id: agentId,
        evidence: {
          anomaly_subtype: 'scope',
          new_actions: newActions,
          historical_actions: Array.from(historicalActions),
          expansion_count: newActions.length
        },
        confidence: 0.8,
        suggested_action: 'verify_authorization'
      });
    }

    return null;
  }

  /**
   * Detect error spike
   */
  _detectErrorSpike(agentId, baseline, currentMetrics) {
    // Need sufficient baseline data
    if (baseline.metrics.error_rate.values.length < this.config.min_samples) {
      return null;
    }

    const zScore = baseline.calculateZScore('error_rate', currentMetrics.error_rate);
    const isHighErrorRate = currentMetrics.error_rate >= this.config.error_spike_threshold;
    
    if (zScore >= this.config.z_score_threshold || isHighErrorRate) {
      const severity = currentMetrics.error_rate >= 0.5 ? 'critical' : 'high';
      
      return createAnomaly({
        anomaly_type: AnomalyType.BEHAVIORAL,
        severity,
        source: this.name,
        entity_type: 'agent',
        entity_id: agentId,
        evidence: {
          anomaly_subtype: 'error_spike',
          current_error_rate: currentMetrics.error_rate,
          baseline_mean: baseline.metrics.error_rate.mean,
          baseline_std: baseline.metrics.error_rate.std_dev,
          z_score: zScore
        },
        confidence: Math.min(0.9, 0.6 + (zScore / 5)),
        suggested_action: 'investigate_errors'
      });
    }

    return null;
  }

  /**
   * Detect time anomaly (activity at unusual hours)
   */
  _detectTimeAnomaly(agentId, baseline, currentMetrics) {
    const typicalHours = baseline.getTypicalHours();
    
    if (typicalHours.size === 0) return null; // No baseline
    
    const unusualHours = [];
    for (const hour of currentMetrics.active_hours) {
      if (!typicalHours.has(hour)) {
        unusualHours.push(hour);
      }
    }

    if (unusualHours.length > 0) {
      const severity = unusualHours.length > 2 ? 'medium' : 'low';
      
      return createAnomaly({
        anomaly_type: AnomalyType.TEMPORAL,
        severity,
        source: this.name,
        entity_type: 'agent',
        entity_id: agentId,
        evidence: {
          anomaly_subtype: 'time',
          unusual_hours: unusualHours,
          typical_hours: Array.from(typicalHours),
          current_hour: new Date().getHours()
        },
        confidence: 0.7,
        suggested_action: 'verify_legitimate_activity'
      });
    }

    return null;
  }

  /**
   * Detect pattern break (change in action distribution)
   */
  _detectPatternBreak(agentId, baseline, currentMetrics) {
    const historicalDistribution = baseline.getActionDistribution();
    
    if (historicalDistribution.size === 0 || currentMetrics.recent_actions.length === 0) {
      return null;
    }

    // Calculate current distribution
    const currentDistribution = new Map();
    const total = currentMetrics.recent_actions.length;
    
    for (const action of currentMetrics.recent_actions) {
      currentDistribution.set(action, (currentDistribution.get(action) || 0) + 1);
    }
    
    // Convert to percentages
    for (const [action, count] of currentDistribution) {
      currentDistribution.set(action, (count / total) * 100);
    }

    // Calculate distribution difference (Hellinger distance approximation)
    let totalDifference = 0;
    const allActions = new Set([...historicalDistribution.keys(), ...currentDistribution.keys()]);
    
    for (const action of allActions) {
      const historicalPct = historicalDistribution.get(action) || 0;
      const currentPct = currentDistribution.get(action) || 0;
      totalDifference += Math.abs(historicalPct - currentPct);
    }

    const normalizedDifference = totalDifference / 100; // Normalize to 0-2 range

    if (normalizedDifference >= this.config.pattern_change_threshold) {
      const severity = normalizedDifference >= 0.8 ? 'high' : 'medium';
      
      return createAnomaly({
        anomaly_type: AnomalyType.BEHAVIORAL,
        severity,
        source: this.name,
        entity_type: 'agent',
        entity_id: agentId,
        evidence: {
          anomaly_subtype: 'pattern_break',
          historical_distribution: Object.fromEntries(historicalDistribution),
          current_distribution: Object.fromEntries(currentDistribution),
          difference_score: normalizedDifference
        },
        confidence: Math.min(0.9, 0.5 + normalizedDifference),
        suggested_action: 'analyze_behavior_change'
      });
    }

    return null;
  }

  /**
   * Calculate severity based on z-score thresholds
   */
  _calculateSeverity(zScore, mediumThreshold = 2.0, highThreshold = 3.0) {
    if (zScore >= highThreshold) return 'critical';
    if (zScore >= mediumThreshold) return 'high';
    return 'medium';
  }

  /**
   * Adjust trust scores based on detected anomalies
   */
  _adjustTrustScores() {
    // Apply trust score adjustments (would integrate with trust management system)
    for (const [agentId, trustDelta] of this.trust_adjustments) {
      // This would integrate with an actual trust management system
      console.log(`[AgentAnomalyDetector] Trust adjustment for ${agentId}: ${trustDelta}`);
    }
    
    this.trust_adjustments.clear();
  }

  /**
   * Record trust score adjustment
   */
  _adjustTrust(agentId, anomaly) {
    const severityPenalties = {
      low: -0.01,
      medium: -0.05,
      high: -0.15,
      critical: -0.30
    };

    const penalty = severityPenalties[anomaly.severity] || 0;
    const currentAdjustment = this.trust_adjustments.get(agentId) || 0;
    
    this.trust_adjustments.set(agentId, currentAdjustment + penalty);
  }

  /**
   * Get agent baseline (for debugging/monitoring)
   */
  getAgentBaseline(agentId) {
    return this.baselines.get(agentId);
  }

  /**
   * Get detection statistics
   */
  getStats() {
    return {
      total_agents_monitored: this.baselines.size,
      baselines_with_sufficient_data: Array.from(this.baselines.values())
        .filter(b => b.metrics.velocity.values.length >= this.config.min_samples).length,
      trust_adjustments_pending: this.trust_adjustments.size,
      detection_config: this.config
    };
  }
}

module.exports = {
  AgentBaseline,
  AgentAnomalyDetector
};