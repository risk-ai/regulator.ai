/**
 * Feedback Integrator
 * 
 * Integrate operator feedback patterns into learning system
 * Phase 18 — Self-Correcting Loop
 */

const crypto = require('crypto');

class FeedbackIntegrator {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Analyze approval patterns
   */
  async analyzeApprovalPatterns(options = {}) {
    const lookbackDays = options.lookbackDays || 30;
    const minOccurrences = options.minOccurrences || 5;

    // Query operator feedback
    const feedback = await this._getOperatorFeedback({
      source: 'approval',
      since: this._daysAgo(lookbackDays)
    });

    if (feedback.length < minOccurrences) {
      return [];
    }

    // Group by action_type + target_id
    const groups = this._groupBy(feedback, f => `${f.action_type}:${f.target_id}`);

    const patterns = [];

    for (const [key, items] of Object.entries(groups)) {
      if (items.length < minOccurrences) continue;

      const approvals = items.filter(f => f.decision === 'approved');
      const denials = items.filter(f => f.decision === 'denied');

      const approvalRate = approvals.length / items.length;
      const avgApprovalTime = this._avg(approvals.map(f => f.time_to_decision_ms));

      // High approval rate + fast approval = candidate for auto-approval
      if (approvalRate >= 0.9 && avgApprovalTime < 300000) { // 5 minutes
        patterns.push({
          pattern_type: 'high_approval_rate',
          action_type: items[0].action_type,
          target_id: items[0].target_id,
          approval_rate: approvalRate,
          avg_approval_time_ms: avgApprovalTime,
          sample_size: items.length,
          recommendation: 'auto_approval_candidate',
          confidence: this._calculateConfidence(items.length, approvalRate)
        });
      }

      // High denial rate = candidate for blocking policy
      if (approvalRate < 0.2) {
        const denialReasons = this._groupBy(denials, d => d.reason);
        const commonReason = Object.entries(denialReasons)
          .sort((a, b) => b[1].length - a[1].length)[0];

        patterns.push({
          pattern_type: 'high_denial_rate',
          action_type: items[0].action_type,
          target_id: items[0].target_id,
          denial_rate: 1 - approvalRate,
          common_denial_reason: commonReason?.[0],
          sample_size: items.length,
          recommendation: 'blocking_policy_candidate',
          confidence: this._calculateConfidence(items.length, 1 - approvalRate)
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze denial patterns
   */
  async analyzeDenialPatterns(options = {}) {
    const lookbackDays = options.lookbackDays || 30;
    const minOccurrences = options.minOccurrences || 3;

    const feedback = await this._getOperatorFeedback({
      source: 'denial',
      since: this._daysAgo(lookbackDays)
    });

    if (feedback.length < minOccurrences) {
      return [];
    }

    // Group by denial reason
    const reasonGroups = this._groupBy(feedback, f => f.reason);

    const patterns = [];

    for (const [reason, items] of Object.entries(reasonGroups)) {
      if (items.length < minOccurrences) continue;

      // Check if denials cluster by time window
      const timeWindows = this._detectTimeWindows(items);

      if (timeWindows.length > 0) {
        patterns.push({
          pattern_type: 'time_based_denial',
          denial_reason: reason,
          time_windows: timeWindows,
          sample_size: items.length,
          recommendation: 'time_window_constraint',
          confidence: this._calculateConfidence(items.length, 0.8)
        });
      }

      // Check if denials cluster by specific target
      const targetGroups = this._groupBy(items, i => i.target_id);
      const dominantTarget = Object.entries(targetGroups)
        .sort((a, b) => b[1].length - a[1].length)[0];

      if (dominantTarget && dominantTarget[1].length / items.length >= 0.7) {
        patterns.push({
          pattern_type: 'target_based_denial',
          denial_reason: reason,
          target_id: dominantTarget[0],
          sample_size: items.length,
          recommendation: 'blocked_entity_constraint',
          confidence: this._calculateConfidence(items.length, dominantTarget[1].length / items.length)
        });
      }
    }

    return patterns;
  }

  /**
   * Analyze override patterns
   */
  async analyzeOverridePatterns(options = {}) {
    const lookbackDays = options.lookbackDays || 30;
    const minOccurrences = options.minOccurrences || 3;

    const feedback = await this._getOperatorFeedback({
      source: 'override',
      since: this._daysAgo(lookbackDays)
    });

    if (feedback.length < minOccurrences) {
      return [];
    }

    // Group by action_type + reason
    const groups = this._groupBy(feedback, f => `${f.action_type}:${f.reason}`);

    const patterns = [];

    for (const [key, items] of Object.entries(groups)) {
      if (items.length < minOccurrences) continue;

      // Policy overrides suggest policy is too strict
      if (items[0].reason && items[0].reason.includes('policy')) {
        patterns.push({
          pattern_type: 'policy_override',
          action_type: items[0].action_type,
          override_reason: items[0].reason,
          sample_size: items.length,
          recommendation: 'policy_relaxation',
          confidence: this._calculateConfidence(items.length, 0.75)
        });
      }

      // Safe mode overrides suggest false alarms
      if (items[0].source === 'safe_mode_override') {
        patterns.push({
          pattern_type: 'safe_mode_override',
          action_type: items[0].action_type,
          sample_size: items.length,
          recommendation: 'safe_mode_threshold_adjustment',
          confidence: this._calculateConfidence(items.length, 0.7)
        });
      }
    }

    return patterns;
  }

  /**
   * Record operator feedback
   */
  async recordFeedback(feedback) {
    const feedbackId = this._generateId('fb');

    // Validate feedback
    if (!feedback.source || !feedback.decision) {
      throw new Error('Invalid feedback: missing source or decision');
    }

    const record = {
      feedback_id: feedbackId,
      source: feedback.source,
      action_type: feedback.action_type,
      target_id: feedback.target_id,
      operator: feedback.operator,
      decision: feedback.decision,
      reason: feedback.reason,
      timestamp: new Date().toISOString(),
      context: JSON.stringify(feedback.context || {}),
      processed: 0
    };

    // Store in State Graph
    await this.stateGraph.run(
      `INSERT INTO operator_feedback (
        feedback_id, source, action_type, target_id, operator, 
        decision, reason, timestamp, context, processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.feedback_id,
        record.source,
        record.action_type,
        record.target_id,
        record.operator,
        record.decision,
        record.reason,
        record.timestamp,
        record.context,
        record.processed
      ]
    );

    return record;
  }

  /**
   * Mark feedback as processed
   */
  async markFeedbackProcessed(feedbackId, metadata = {}) {
    await this.stateGraph.run(
      `UPDATE operator_feedback 
       SET processed = 1, processed_at = ? 
       WHERE feedback_id = ?`,
      [new Date().toISOString(), feedbackId]
    );
  }

  // Helper methods

  async _getOperatorFeedback(filters = {}) {
    // Mock implementation - would query operator_feedback table
    return [];
  }

  _groupBy(items, keyFn) {
    const groups = {};
    
    for (const item of items) {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(item);
    }

    return groups;
  }

  _detectTimeWindows(items) {
    // Simple time window detection
    const hourCounts = new Array(24).fill(0);
    
    for (const item of items) {
      const hour = new Date(item.timestamp).getHours();
      hourCounts[hour]++;
    }

    const threshold = items.length * 0.3; // 30% of denials in same hour
    const windows = [];

    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] >= threshold) {
        windows.push({
          start_hour: i,
          end_hour: i + 1,
          denial_count: hourCounts[i]
        });
      }
    }

    return windows;
  }

  _avg(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  _daysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  _calculateConfidence(sampleSize, metric) {
    if (sampleSize < 5) return 0.5;
    if (sampleSize < 10) return 0.7;
    if (sampleSize < 20) return 0.85;
    return 0.9;
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
  }
}

module.exports = FeedbackIntegrator;
