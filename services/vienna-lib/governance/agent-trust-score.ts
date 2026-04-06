/**
 * Agent Trust Scoring — Vienna OS
 * 
 * Computes a dynamic trust score per agent based on operational history.
 * The score drives governance recommendations:
 * - High-trust agents → recommend tier relaxation
 * - Low-trust agents → recommend tighter governance
 * - Anomalous agents → flag for review
 * 
 * Score components (100-point scale):
 * 1. Approval Rate (0-30): % of intents approved
 * 2. Compliance Rate (0-25): % of actions within warrant scope
 * 3. Stability (0-20): consistency of behavior over time
 * 4. Anomaly Factor (0-15): inverse of anomaly frequency
 * 5. Tenure (0-10): how long the agent has been operating
 * 
 * Trust levels:
 * - 90-100: Exemplary — candidate for tier relaxation
 * - 70-89: Good — standard governance
 * - 50-69: Watch — increased monitoring recommended
 * - 25-49: Probation — tighter governance recommended
 * - 0-24: Restricted — manual approval for all actions
 */

import type { RiskTierLevel } from './risk-tier';

// ─── Types ───

export type TrustLevel = 'exemplary' | 'good' | 'watch' | 'probation' | 'restricted';

export interface TrustScoreComponents {
  approval_rate: { score: number; max: 30; approved: number; total: number };
  compliance_rate: { score: number; max: 25; in_scope: number; total: number };
  stability: { score: number; max: 20; variance: number };
  anomaly_factor: { score: number; max: 15; anomalies: number; total_actions: number };
  tenure: { score: number; max: 10; days_active: number };
}

export interface AgentTrustScore {
  agent_id: string;
  tenant_id: string;
  /** Overall trust score (0-100) */
  score: number;
  /** Trust level classification */
  level: TrustLevel;
  /** Individual score components */
  components: TrustScoreComponents;
  /** Governance recommendation */
  recommendation: TrustRecommendation;
  /** Historical trend */
  trend: 'improving' | 'stable' | 'declining';
  /** Score computed at */
  computed_at: string;
  /** Data window used */
  window: { start: string; end: string; events_analyzed: number };
}

export interface TrustRecommendation {
  action: 'relax' | 'maintain' | 'tighten' | 'restrict' | 'review';
  reason: string;
  suggested_tier_change?: { from: RiskTierLevel; to: RiskTierLevel };
  suggested_scope_change?: { add?: string[]; remove?: string[] };
}

export interface AgentHistoryEvent {
  event: string;
  agent_id: string;
  action?: string;
  risk_tier?: string;
  approved?: boolean;
  denied?: boolean;
  in_scope?: boolean;
  anomaly?: boolean;
  anomaly_severity?: string;
  timestamp: string;
}

export interface TrustScoreSnapshot {
  agent_id: string;
  score: number;
  level: TrustLevel;
  computed_at: string;
}

// ─── Trust Score Engine ───

export class AgentTrustEngine {

  /**
   * Compute trust score for an agent based on operational history.
   */
  computeScore(
    agentId: string,
    tenantId: string,
    events: AgentHistoryEvent[],
    previousScores?: TrustScoreSnapshot[]
  ): AgentTrustScore {
    const agentEvents = events.filter(e => e.agent_id === agentId);

    if (agentEvents.length === 0) {
      return this._emptyScore(agentId, tenantId);
    }

    // Sort by timestamp
    agentEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const window = {
      start: agentEvents[0].timestamp,
      end: agentEvents[agentEvents.length - 1].timestamp,
      events_analyzed: agentEvents.length,
    };

    // Compute components
    const approvalRate = this._computeApprovalRate(agentEvents);
    const complianceRate = this._computeComplianceRate(agentEvents);
    const stability = this._computeStability(agentEvents);
    const anomalyFactor = this._computeAnomalyFactor(agentEvents);
    const tenure = this._computeTenure(agentEvents);

    const components: TrustScoreComponents = {
      approval_rate: approvalRate,
      compliance_rate: complianceRate,
      stability,
      anomaly_factor: anomalyFactor,
      tenure,
    };

    const score = Math.round(
      approvalRate.score +
      complianceRate.score +
      stability.score +
      anomalyFactor.score +
      tenure.score
    );

    const level = this._classifyLevel(score);
    const recommendation = this._generateRecommendation(score, level, components, agentEvents);
    const trend = this._computeTrend(score, previousScores || []);

    return {
      agent_id: agentId,
      tenant_id: tenantId,
      score,
      level,
      components,
      recommendation,
      trend,
      computed_at: new Date().toISOString(),
      window,
    };
  }

  /**
   * Compute trust scores for all agents in a tenant.
   */
  computeAll(
    tenantId: string,
    events: AgentHistoryEvent[],
    previousScores?: Map<string, TrustScoreSnapshot[]>
  ): AgentTrustScore[] {
    const agentIds = new Set(events.map(e => e.agent_id));
    return Array.from(agentIds).map(agentId =>
      this.computeScore(
        agentId,
        tenantId,
        events,
        previousScores?.get(agentId)
      )
    );
  }

  // ─── Component Computations ───

  private _computeApprovalRate(events: AgentHistoryEvent[]): TrustScoreComponents['approval_rate'] {
    const intentEvents = events.filter(e =>
      e.event?.includes('approved') || e.event?.includes('denied') || e.event?.includes('submitted')
    );

    const submitted = intentEvents.filter(e => e.event?.includes('submitted')).length;
    const approved = intentEvents.filter(e => e.event?.includes('approved') || e.approved).length;

    const total = Math.max(submitted, approved + intentEvents.filter(e => e.denied).length);
    if (total === 0) return { score: 15, max: 30, approved: 0, total: 0 }; // Neutral

    const rate = approved / total;
    // Score: 0% → 0, 80% → 24, 95% → 28, 100% → 30
    const score = Math.round(rate * rate * 30); // Quadratic — rewards high rates more

    return { score, max: 30, approved, total };
  }

  private _computeComplianceRate(events: AgentHistoryEvent[]): TrustScoreComponents['compliance_rate'] {
    const scopeEvents = events.filter(e =>
      e.in_scope !== undefined || e.event?.includes('scope')
    );

    const inScope = scopeEvents.filter(e => e.in_scope || !e.event?.includes('drift')).length;
    const total = scopeEvents.length;

    if (total === 0) return { score: 12, max: 25, in_scope: 0, total: 0 }; // Neutral

    const rate = inScope / total;
    const score = Math.round(rate * 25);

    return { score, max: 25, in_scope: inScope, total };
  }

  private _computeStability(events: AgentHistoryEvent[]): TrustScoreComponents['stability'] {
    // Stability = low variance in daily action counts
    const dailyCounts = new Map<string, number>();
    for (const e of events) {
      const day = e.timestamp.split('T')[0];
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }

    const counts = Array.from(dailyCounts.values());
    if (counts.length <= 1) return { score: 10, max: 20, variance: 0 }; // Neutral

    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / counts.length;
    const coeffOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;

    // Low CoV = stable = high score
    // CoV 0 → 20, CoV 0.5 → 15, CoV 1.0 → 10, CoV 2.0 → 5, CoV 3+ → 0
    const score = Math.max(0, Math.round(20 * (1 - Math.min(coeffOfVariation / 3, 1))));

    return { score, max: 20, variance: Math.round(variance * 100) / 100 };
  }

  private _computeAnomalyFactor(events: AgentHistoryEvent[]): TrustScoreComponents['anomaly_factor'] {
    const anomalies = events.filter(e => e.anomaly || e.event?.includes('anomaly'));
    const totalActions = events.filter(e =>
      e.event?.includes('submitted') || e.event?.includes('intent')
    ).length;

    if (totalActions === 0) return { score: 8, max: 15, anomalies: 0, total_actions: 0 }; // Neutral

    const anomalyRate = anomalies.length / totalActions;

    // 0 anomalies → 15, 1% → 12, 5% → 8, 10% → 4, 20%+ → 0
    const score = Math.max(0, Math.round(15 * (1 - Math.min(anomalyRate * 5, 1))));

    // Severe anomalies have extra penalty
    const severeAnomalies = anomalies.filter(e => e.anomaly_severity === 'high' || e.anomaly_severity === 'critical');
    const severePenalty = severeAnomalies.length * 3;

    return {
      score: Math.max(0, score - severePenalty),
      max: 15,
      anomalies: anomalies.length,
      total_actions: totalActions,
    };
  }

  private _computeTenure(events: AgentHistoryEvent[]): TrustScoreComponents['tenure'] {
    if (events.length === 0) return { score: 0, max: 10, days_active: 0 };

    const first = new Date(events[0].timestamp).getTime();
    const last = new Date(events[events.length - 1].timestamp).getTime();
    const daysActive = Math.ceil((last - first) / (24 * 60 * 60 * 1000));

    // 0 days → 0, 7 days → 3, 30 days → 7, 90 days → 9, 180+ days → 10
    const score = Math.min(10, Math.round(10 * (1 - Math.exp(-daysActive / 60))));

    return { score, max: 10, days_active: daysActive };
  }

  // ─── Classification ───

  private _classifyLevel(score: number): TrustLevel {
    if (score >= 90) return 'exemplary';
    if (score >= 70) return 'good';
    if (score >= 50) return 'watch';
    if (score >= 25) return 'probation';
    return 'restricted';
  }

  // ─── Recommendations ───

  private _generateRecommendation(
    score: number,
    level: TrustLevel,
    components: TrustScoreComponents,
    events: AgentHistoryEvent[]
  ): TrustRecommendation {
    // Determine most common tier
    const tierCounts: Record<string, number> = {};
    for (const e of events) {
      if (e.risk_tier) tierCounts[e.risk_tier] = (tierCounts[e.risk_tier] || 0) + 1;
    }
    const primaryTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as RiskTierLevel | undefined;

    if (level === 'exemplary') {
      const tierOrder: RiskTierLevel[] = ['T3', 'T2', 'T1', 'T0'];
      const currentIdx = primaryTier ? tierOrder.indexOf(primaryTier) : -1;
      const suggestedTier = currentIdx > 0 ? tierOrder[currentIdx - 1] : undefined;

      return {
        action: 'relax',
        reason: `Agent has ${score}/100 trust score with ${components.approval_rate.approved}/${components.approval_rate.total} approval rate and ${components.anomaly_factor.anomalies} anomalies. Consider reducing governance overhead.`,
        suggested_tier_change: suggestedTier && primaryTier ? { from: primaryTier, to: suggestedTier } : undefined,
      };
    }

    if (level === 'good') {
      return {
        action: 'maintain',
        reason: `Agent operating within expected parameters. Trust score ${score}/100.`,
      };
    }

    if (level === 'watch') {
      const issues: string[] = [];
      if (components.approval_rate.score < 15) issues.push('low approval rate');
      if (components.anomaly_factor.score < 8) issues.push('elevated anomaly rate');
      if (components.stability.score < 10) issues.push('inconsistent activity pattern');

      return {
        action: 'review',
        reason: `Agent needs attention: ${issues.join(', ')}. Trust score ${score}/100.`,
      };
    }

    if (level === 'probation') {
      return {
        action: 'tighten',
        reason: `Agent showing concerning patterns. Trust score ${score}/100. Recommend increasing approval requirements.`,
        suggested_tier_change: primaryTier && primaryTier !== 'T3' ? {
          from: primaryTier,
          to: (primaryTier === 'T0' ? 'T1' : primaryTier === 'T1' ? 'T2' : 'T3') as RiskTierLevel,
        } : undefined,
      };
    }

    // Restricted
    return {
      action: 'restrict',
      reason: `Agent trust critically low (${score}/100). Recommend manual approval for all actions.`,
      suggested_tier_change: primaryTier ? { from: primaryTier, to: 'T3' } : undefined,
    };
  }

  // ─── Trend ───

  private _computeTrend(
    currentScore: number,
    previousScores: TrustScoreSnapshot[]
  ): 'improving' | 'stable' | 'declining' {
    if (previousScores.length === 0) return 'stable';

    // Compare to average of last 3 scores
    const recent = previousScores
      .sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime())
      .slice(0, 3);

    const avgPrevious = recent.reduce((a, b) => a + b.score, 0) / recent.length;
    const delta = currentScore - avgPrevious;

    if (delta > 5) return 'improving';
    if (delta < -5) return 'declining';
    return 'stable';
  }

  // ─── Empty Score ───

  private _emptyScore(agentId: string, tenantId: string): AgentTrustScore {
    return {
      agent_id: agentId,
      tenant_id: tenantId,
      score: 50,
      level: 'watch',
      components: {
        approval_rate: { score: 15, max: 30, approved: 0, total: 0 },
        compliance_rate: { score: 12, max: 25, in_scope: 0, total: 0 },
        stability: { score: 10, max: 20, variance: 0 },
        anomaly_factor: { score: 8, max: 15, anomalies: 0, total_actions: 0 },
        tenure: { score: 0, max: 10, days_active: 0 },
      },
      recommendation: {
        action: 'review',
        reason: 'New agent with no operational history. Monitor initial behavior.',
      },
      trend: 'stable',
      computed_at: new Date().toISOString(),
      window: { start: new Date().toISOString(), end: new Date().toISOString(), events_analyzed: 0 },
    };
  }
}

export default AgentTrustEngine;
