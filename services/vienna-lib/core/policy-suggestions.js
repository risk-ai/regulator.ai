/**
 * AI-Powered Policy Suggestions
 * 
 * Analyzes action patterns and suggests governance rules.
 * "We noticed X pattern, suggest Y rule."
 * 
 * This is a Phase 3 differentiator — no competitor has this.
 */

class PolicySuggestionEngine {
  constructor(options = {}) {
    this.minSampleSize = options.minSampleSize || 20;
    this.analysisWindowHours = options.analysisWindowHours || 168; // 7 days
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    
    // Pattern buffers
    this._actionLog = [];
    this._maxLogSize = options.maxLogSize || 10000;
  }

  /**
   * Record an action for pattern analysis.
   * Called after every intent evaluation.
   */
  recordAction(action) {
    this._actionLog.push({
      ...action,
      recorded_at: Date.now()
    });

    // Trim old entries
    if (this._actionLog.length > this._maxLogSize) {
      this._actionLog = this._actionLog.slice(-this._maxLogSize);
    }
  }

  /**
   * Analyze patterns and generate suggestions.
   * Call periodically (e.g., hourly or on-demand).
   * 
   * @returns {PolicySuggestion[]}
   */
  analyze() {
    const windowStart = Date.now() - (this.analysisWindowHours * 3600 * 1000);
    const recentActions = this._actionLog.filter(a => a.recorded_at >= windowStart);

    if (recentActions.length < this.minSampleSize) {
      return [];
    }

    const suggestions = [];

    // Pattern 1: After-hours activity spike
    suggestions.push(...this._detectAfterHoursPattern(recentActions));

    // Pattern 2: High-frequency agent actions (possible runaway)
    suggestions.push(...this._detectHighFrequencyAgent(recentActions));

    // Pattern 3: Repeated denied actions (scope creep attempts)
    suggestions.push(...this._detectRepeatedDenials(recentActions));

    // Pattern 4: Ungovened high-risk actions (missing T2+ classification)
    suggestions.push(...this._detectUngovernedHighRisk(recentActions));

    // Pattern 5: Single-approver bottleneck
    suggestions.push(...this._detectApproverBottleneck(recentActions));

    // Pattern 6: Actions without verification
    suggestions.push(...this._detectMissingVerification(recentActions));

    return suggestions.filter(s => s.confidence >= this.confidenceThreshold);
  }

  /**
   * Pattern 1: Significant after-hours activity
   */
  _detectAfterHoursPattern(actions) {
    const afterHours = actions.filter(a => {
      const hour = new Date(a.recorded_at).getHours();
      return hour >= 22 || hour < 6;
    });

    const ratio = afterHours.length / actions.length;
    
    if (ratio > 0.15 && afterHours.length >= 10) {
      return [{
        type: 'after_hours_policy',
        title: 'After-Hours Activity Detected',
        description: `${afterHours.length} actions (${(ratio * 100).toFixed(0)}%) occurred between 10 PM and 6 AM. Consider adding an after-hours escalation policy.`,
        suggested_rule: {
          name: 'after-hours-escalation',
          conditions: [
            { field: 'time.hour', operator: 'gte', value: 22 },
            { field: 'time.hour', operator: 'lt', value: 6, join: 'OR' }
          ],
          action_on_match: 'escalate_tier',
          approval_tier: 'T2'
        },
        confidence: Math.min(0.5 + ratio, 0.95),
        evidence: {
          after_hours_count: afterHours.length,
          total_count: actions.length,
          ratio: ratio
        }
      }];
    }
    return [];
  }

  /**
   * Pattern 2: Agent executing too many actions in short window
   */
  _detectHighFrequencyAgent(actions) {
    const agentCounts = {};
    const windowMs = 3600 * 1000; // 1 hour windows
    
    for (const action of actions) {
      const agentId = action.agent_id || 'unknown';
      const hourBucket = Math.floor(action.recorded_at / windowMs);
      const key = `${agentId}:${hourBucket}`;
      agentCounts[key] = (agentCounts[key] || 0) + 1;
    }

    const suggestions = [];
    const highFreq = Object.entries(agentCounts)
      .filter(([, count]) => count > 100)
      .map(([key, count]) => ({ agentId: key.split(':')[0], count }));

    const uniqueAgents = [...new Set(highFreq.map(h => h.agentId))];
    
    for (const agentId of uniqueAgents) {
      const maxCount = Math.max(...highFreq.filter(h => h.agentId === agentId).map(h => h.count));
      suggestions.push({
        type: 'rate_limit_agent',
        title: `High-Frequency Agent: ${agentId}`,
        description: `Agent '${agentId}' peaked at ${maxCount} actions/hour. Consider adding a rate limit policy.`,
        suggested_rule: {
          name: `rate-limit-${agentId}`,
          conditions: [
            { field: 'agent_id', operator: 'eq', value: agentId },
            { field: 'actions_per_hour', operator: 'gt', value: 50 }
          ],
          action_on_match: 'throttle',
          max_per_hour: 50
        },
        confidence: Math.min(0.6 + (maxCount / 500), 0.95),
        evidence: { agent_id: agentId, max_actions_per_hour: maxCount }
      });
    }
    return suggestions;
  }

  /**
   * Pattern 3: Agent repeatedly getting denied (scope creep)
   */
  _detectRepeatedDenials(actions) {
    const denials = actions.filter(a => a.outcome === 'denied');
    const agentDenials = {};
    
    for (const d of denials) {
      const agentId = d.agent_id || 'unknown';
      agentDenials[agentId] = (agentDenials[agentId] || 0) + 1;
    }

    return Object.entries(agentDenials)
      .filter(([, count]) => count >= 5)
      .map(([agentId, count]) => ({
        type: 'scope_creep_alert',
        title: `Repeated Denials: ${agentId}`,
        description: `Agent '${agentId}' has been denied ${count} times. This may indicate scope creep or misconfiguration. Consider reviewing the agent's capabilities.`,
        suggested_rule: {
          name: `quarantine-${agentId}`,
          conditions: [
            { field: 'agent_id', operator: 'eq', value: agentId },
            { field: 'denial_count_24h', operator: 'gt', value: 10 }
          ],
          action_on_match: 'quarantine',
          alert_security: true
        },
        confidence: Math.min(0.5 + (count / 20), 0.95),
        evidence: { agent_id: agentId, denial_count: count }
      }));
  }

  /**
   * Pattern 4: High-value actions running at T0/T1 (should be T2+)
   */
  _detectUngovernedHighRisk(actions) {
    const suspiciousPatterns = [
      { pattern: /delete|drop|remove/i, label: 'destructive' },
      { pattern: /transfer|payment|wire/i, label: 'financial' },
      { pattern: /deploy.*prod/i, label: 'production deployment' },
      { pattern: /export.*user|export.*data/i, label: 'data export' },
    ];

    const suggestions = [];
    
    for (const { pattern, label } of suspiciousPatterns) {
      const matches = actions.filter(a => 
        (a.risk_tier === 'T0' || a.risk_tier === 'T1') &&
        pattern.test(a.action || '')
      );

      if (matches.length >= 3) {
        suggestions.push({
          type: 'missing_governance',
          title: `Ungoverned ${label} Actions`,
          description: `${matches.length} ${label} actions ran at T0/T1. These typically warrant T2+ governance.`,
          suggested_rule: {
            name: `govern-${label.replace(/\s+/g, '-')}`,
            conditions: [
              { field: 'action', operator: 'matches', value: pattern.source }
            ],
            action_on_match: 'require_approval',
            approval_tier: 'T2'
          },
          confidence: 0.85,
          evidence: { 
            pattern: label,
            count: matches.length,
            sample_actions: matches.slice(0, 3).map(m => m.action)
          }
        });
      }
    }
    return suggestions;
  }

  /**
   * Pattern 5: Single approver handling all T2 approvals
   */
  _detectApproverBottleneck(actions) {
    const approvals = actions.filter(a => a.approved_by);
    const approverCounts = {};
    
    for (const a of approvals) {
      const approver = a.approved_by;
      approverCounts[approver] = (approverCounts[approver] || 0) + 1;
    }

    const totalApprovals = approvals.length;
    if (totalApprovals < 10) return [];

    return Object.entries(approverCounts)
      .filter(([, count]) => count / totalApprovals > 0.7)
      .map(([approver, count]) => ({
        type: 'approver_bottleneck',
        title: `Approval Bottleneck: ${approver}`,
        description: `${approver} handled ${count}/${totalApprovals} (${((count/totalApprovals)*100).toFixed(0)}%) of all approvals. Consider distributing approval authority.`,
        suggested_rule: {
          name: 'distribute-approvals',
          conditions: [],
          action_on_match: 'rotate_approvers',
          recommended_approvers: 3
        },
        confidence: Math.min(0.6 + (count / totalApprovals * 0.3), 0.9),
        evidence: { approver, count, total: totalApprovals, ratio: count / totalApprovals }
      }));
  }

  /**
   * Pattern 6: Executions without post-execution verification
   */
  _detectMissingVerification(actions) {
    const executions = actions.filter(a => a.type === 'execution');
    const unverified = executions.filter(a => !a.verified);

    if (unverified.length >= 5 && unverified.length / Math.max(executions.length, 1) > 0.1) {
      return [{
        type: 'missing_verification',
        title: 'Unverified Executions',
        description: `${unverified.length} executions completed without verification. Enable mandatory post-execution verification.`,
        suggested_rule: {
          name: 'mandatory-verification',
          conditions: [{ field: 'action', operator: 'not_eq', value: 'read' }],
          action_on_match: 'require_verification',
          verification_type: 'post_execution'
        },
        confidence: 0.8,
        evidence: { unverified: unverified.length, total_executions: executions.length }
      }];
    }
    return [];
  }

  /**
   * Get engine stats
   */
  getStats() {
    return {
      log_size: this._actionLog.length,
      max_log_size: this._maxLogSize,
      oldest_entry: this._actionLog[0]?.recorded_at || null,
      newest_entry: this._actionLog[this._actionLog.length - 1]?.recorded_at || null
    };
  }
}

module.exports = { PolicySuggestionEngine };
