/**
 * Approval Intelligence Layer — Phase 17.3
 * 
 * Reduces operator burden without removing control through:
 * - Risk-based approval grouping
 * - Auto-expiry policies
 * - Approval suggestions
 * - Approval batching
 */

const ApprovalState = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  EXPIRED: 'expired'
};

/**
 * Risk scoring for approvals
 */
const RiskScore = {
  LOW: 0.2,      // Safe operations (read-only, dev environments)
  MEDIUM: 0.5,   // Moderate risk (service restart, config change)
  HIGH: 0.75,    // High risk (trading, production changes)
  CRITICAL: 0.95 // Critical operations (emergency stop, data delete)
};

/**
 * Approval Intelligence Engine
 * 
 * Groups approvals by risk, suggests grouping, manages expiry.
 */
class ApprovalIntelligence {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Score approval by risk level
   * 
   * @param {object} approval - Approval object
   * @returns {number} Risk score 0-1
   */
  scoreRisk(approval) {
    const { risk_tier, target_id, action_type, context = {} } = approval;

    let baseScore = 0;

    // Risk tier base
    if (risk_tier === 'T0') baseScore = RiskScore.LOW;
    if (risk_tier === 'T1') baseScore = RiskScore.MEDIUM;
    if (risk_tier === 'T2') baseScore = RiskScore.HIGH;
    
    // Special handling for trading actions - ensure they land in high_risk
    if (action_type && action_type.includes('trading')) {
      baseScore = Math.max(baseScore, RiskScore.HIGH);
    }

    // Action modifiers
    const actionModifiers = {
      'restart_service': 0.1,
      'restart_trading_service': 0.3,
      'config_change': 0.15,
      'delete_data': 0.3,
      'trading_window_change': 0.4,
      'kill_switch': 0.5,
      'read_query': -0.15,
      'health_check': -0.1
    };

    baseScore += (actionModifiers[action_type] || 0);

    // Context modifiers
    if (context.trading_active) baseScore += 0.3;
    if (context.market_hours) baseScore += 0.2;
    if (context.production_env) baseScore += 0.15;
    if (context.high_concurrency) baseScore += 0.1;

    // Clamp to 0-1
    return Math.max(0, Math.min(1, baseScore));
  }

  /**
   * Group pending approvals by risk level
   * 
   * @returns {object} Grouped approvals
   */
  async groupApprovalsByRisk() {
    const pending = await this.stateGraph.listApprovals({
      status: ApprovalState.PENDING
    });

    const groups = {
      low_risk: [],
      medium_risk: [],
      high_risk: [],
      critical_risk: []
    };

    for (const approval of pending) {
      const risk = this.scoreRisk(approval);
      approval.risk_score = risk;

      if (risk < RiskScore.MEDIUM) groups.low_risk.push(approval);
      else if (risk < RiskScore.HIGH) groups.medium_risk.push(approval);
      else if (risk < RiskScore.CRITICAL) groups.high_risk.push(approval);
      else groups.critical_risk.push(approval);
    }

    // Sort by risk within groups
    for (const group of Object.values(groups)) {
      group.sort((a, b) => b.risk_score - a.risk_score);
    }

    return groups;
  }

  /**
   * Suggest approval batching
   * 
   * Groups related approvals that can be reviewed together.
   * 
   * @returns {object} Batch suggestions
   */
  async suggestApprovalBatches() {
    const pending = await this.stateGraph.listApprovals({
      status: ApprovalState.PENDING
    });

    const batches = [];
    const targetGroups = new Map();

    // Group by target
    for (const approval of pending) {
      if (!targetGroups.has(approval.target_id)) {
        targetGroups.set(approval.target_id, []);
      }
      targetGroups.get(approval.target_id).push(approval);
    }

    // Create batch suggestions
    for (const [targetId, approvals] of targetGroups) {
      if (approvals.length >= 2) {
        const risks = approvals.map(a => this.scoreRisk(a));
        const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;

        batches.push({
          target_id: targetId,
          approval_ids: approvals.map(a => a.approval_id),
          count: approvals.length,
          avg_risk: avgRisk,
          actions: approvals.map(a => a.action_type),
          reasoning: `${approvals.length} approvals for same target can be reviewed together`,
          operator_action: 'Batch review recommended'
        });
      }
    }

    // Sort by number of items in batch
    batches.sort((a, b) => b.count - a.count);

    return batches;
  }

  /**
   * Get approval suggestions
   * 
   * Recommends which approvals to handle first based on:
   * - Risk level
   * - Business impact
   * - Time sensitivity
   * - Grouping opportunity
   * 
   * @returns {object} Suggestions
   */
  async getApprovalSuggestions() {
    const pending = await this.stateGraph.listApprovals({
      status: ApprovalState.PENDING
    });

    const suggestions = [];

    for (const approval of pending) {
      const risk = this.scoreRisk(approval);
      const priority = this.calculatePriority(approval, risk);

      suggestions.push({
        approval_id: approval.approval_id,
        action: approval.action_type,
        target: approval.target_id,
        risk_score: risk,
        priority,
        time_until_expiry_ms: this.getTimeUntilExpiry(approval),
        recommended_action: this.getRecommendedAction(approval, risk, priority),
        impact_summary: this.summarizeImpact(approval)
      });
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    return {
      suggestions,
      summary: {
        total_pending: pending.length,
        critical_count: suggestions.filter(s => s.risk_score >= RiskScore.CRITICAL).length,
        high_risk_count: suggestions.filter(s => s.risk_score >= RiskScore.HIGH).length,
        medium_risk_count: suggestions.filter(s => s.risk_score >= RiskScore.MEDIUM).length,
        low_risk_count: suggestions.filter(s => s.risk_score < RiskScore.MEDIUM).length,
        operator_action: this.getOperatorAction(suggestions)
      }
    };
  }

  /**
   * Calculate approval priority
   * 
   * Combines risk, urgency, and business impact.
   */
  calculatePriority(approval, risk) {
    let priority = risk; // Base priority from risk

    // Time sensitivity
    const expiryMs = this.getTimeUntilExpiry(approval);
    if (expiryMs < 60000) priority += 0.5; // < 1 minute: urgent
    else if (expiryMs < 300000) priority += 0.3; // < 5 min: soon
    else if (expiryMs < 600000) priority += 0.1; // < 10 min: moderate

    // Business impact
    if (approval.context?.trading_active) priority += 0.3;
    if (approval.context?.blocking_other_work) priority += 0.2;

    return Math.min(1, priority);
  }

  /**
   * Get recommended action for operator
   */
  getRecommendedAction(approval, risk, priority) {
    if (risk >= RiskScore.CRITICAL) {
      return 'URGENT: Review immediately - critical risk';
    }

    if (priority >= 0.8) {
      return 'Priority: Review within 5 minutes';
    }

    if (priority >= 0.5) {
      return 'Normal: Review in batch with similar items';
    }

    return 'Low priority: Safe to defer or batch';
  }

  /**
   * Get time until expiry
   */
  getTimeUntilExpiry(approval) {
    const expiryAt = new Date(approval.expires_at);
    const now = new Date();
    return Math.max(0, expiryAt - now);
  }

  /**
   * Summarize business impact
   */
  summarizeImpact(approval) {
    const impacts = [];

    if (approval.context?.affects_trading) {
      impacts.push('Affects trading operations');
    }
    if (approval.context?.blocking_deployments) {
      impacts.push('Blocking deployments');
    }
    if (approval.context?.user_impact) {
      impacts.push(`${approval.context.user_impact} users affected`);
    }
    if (approval.context?.sla_impact) {
      impacts.push('SLA impact: ' + approval.context.sla_impact);
    }

    return impacts.length > 0 ? impacts : ['No critical business impact'];
  }

  /**
   * Get operator summary action
   */
  getOperatorAction(suggestions) {
    const critical = suggestions.filter(s => s.risk_score >= RiskScore.CRITICAL);
    if (critical.length > 0) {
      return `URGENT: ${critical.length} critical approval(s) require immediate attention`;
    }

    const expiring = suggestions.filter(s => s.time_until_expiry_ms < 300000);
    if (expiring.length > 0) {
      return `ACTION: ${expiring.length} approval(s) expiring soon`;
    }

    const highRisk = suggestions.filter(s => s.risk_score >= RiskScore.HIGH);
    if (highRisk.length > 0) {
      return `REVIEW: ${highRisk.length} high-risk approval(s) await review`;
    }

    return `Review available: ${suggestions.length} pending approval(s)`;
  }

  /**
   * Set auto-expiry policy
   * 
   * Automatically expires low-risk approvals after inactivity.
   */
  async setAutoExpiryPolicy(policy) {
    const {
      risk_threshold = RiskScore.MEDIUM,
      inactivity_ms = 3600000, // 1 hour default
      auto_deny = false
    } = policy;

    return {
      policy_id: 'auto_expiry_' + Date.now(),
      risk_threshold,
      inactivity_ms,
      auto_deny,
      created_at: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * Apply auto-expiry policy
   */
  async applyAutoExpiryPolicy(policyId) {
    const policy = await this.stateGraph.getPolicy(policyId);

    const pending = await this.stateGraph.listApprovals({
      status: ApprovalState.PENDING
    });

    const expired = [];

    for (const approval of pending) {
      const risk = this.scoreRisk(approval);

      // Check if meets expiry criteria
      if (risk < policy.risk_threshold) {
        const age = Date.now() - new Date(approval.created_at).getTime();

        if (age > policy.inactivity_ms) {
          expired.push({
            approval_id: approval.approval_id,
            action: policy.auto_deny ? 'auto_denied' : 'auto_expired',
            reason: 'Auto-expiry policy',
            policy_id: policyId
          });

          if (policy.auto_deny) {
            await this.stateGraph.updateApprovalStatus(
              approval.approval_id,
              ApprovalState.DENIED,
              {
                denied_by: 'system',
                denial_reason: 'Auto-denied by expiry policy',
                policy_id: policyId
              }
            );
          } else {
            await this.stateGraph.updateApprovalStatus(
              approval.approval_id,
              ApprovalState.EXPIRED,
              { policy_id: policyId }
            );
          }
        }
      }
    }

    return {
      policy_id: policyId,
      processed: expired.length,
      actions: expired
    };
  }

  /**
   * Bulk approve similar items
   * 
   * Approves multiple low-risk items with single operator action.
   */
  async bulkApproveByPattern(pattern, reviewedBy) {
    const pending = await this.stateGraph.listApprovals({
      status: ApprovalState.PENDING
    });

    const matching = pending.filter(approval => {
      if (pattern.action_type && approval.action_type !== pattern.action_type) {
        return false;
      }

      if (pattern.target_type && approval.target_type !== pattern.target_type) {
        return false;
      }

      const risk = this.scoreRisk(approval);
      if (pattern.max_risk && risk > pattern.max_risk) {
        return false;
      }

      if (pattern.min_risk && risk < pattern.min_risk) {
        return false;
      }

      return true;
    });

    const approved = [];

    for (const approval of matching) {
      await this.stateGraph.updateApprovalStatus(
        approval.approval_id,
        ApprovalState.APPROVED,
        {
          approved_by: reviewedBy,
          bulk_approval: true,
          bulk_approval: true,
          pattern: pattern
        }
      );

      approved.push(approval.approval_id);
    }

    return {
      pattern,
      approved_count: approved.length,
      approved_ids: approved,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Recommend follow-up actions based on approval patterns
   */
  async getFollowUpRecommendations() {
    const recent = await this.stateGraph.listApprovals({
      limit: 50
    });

    const recommendations = [];

    // Pattern 1: Repeated rejections
    const rejectedByOperator = recent.filter(a => a.status === ApprovalState.DENIED);
    const operatorCounts = new Map();

    for (const approval of rejectedByOperator) {
      const operator = approval.denied_by;
      operatorCounts.set(operator, (operatorCounts.get(operator) || 0) + 1);
    }

    for (const [operator, count] of operatorCounts) {
      if (count >= 3) {
        recommendations.push({
          type: 'repeated_rejections',
          operator,
          count,
          recommendation: `${operator} has denied ${count} approvals recently. Consider: (1) adjusting risk thresholds, (2) adding constraints to reduce risky proposals`,
          action: 'Review policy or proposal patterns'
        });
      }
    }

    // Pattern 2: High expiry rate
    const expired = recent.filter(a => a.status === ApprovalState.EXPIRED);
    if (expired.length > 10) {
      recommendations.push({
        type: 'high_expiry_rate',
        expired_count: expired.length,
        recommendation: `High approval expiry rate (${expired.length}/50 recent). Operators may be overloaded. Consider: (1) adjusting expiry windows, (2) auto-approving low-risk items`,
        action: 'Adjust approval timeout or auto-expiry policy'
      });
    }

    return {
      recommendations,
      summary: recommendations.length > 0 ?
        `${recommendations.length} pattern(s) detected in approval history` :
        'No concerning patterns detected'
    };
  }
}

module.exports = {
  ApprovalIntelligence,
  RiskScore
};
