var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var agent_trust_score_exports = {};
__export(agent_trust_score_exports, {
  AgentTrustEngine: () => AgentTrustEngine,
  default: () => agent_trust_score_default
});
module.exports = __toCommonJS(agent_trust_score_exports);
class AgentTrustEngine {
  /**
   * Compute trust score for an agent based on operational history.
   */
  computeScore(agentId, tenantId, events, previousScores) {
    const agentEvents = events.filter((e) => e.agent_id === agentId);
    if (agentEvents.length === 0) {
      return this._emptyScore(agentId, tenantId);
    }
    agentEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const window = {
      start: agentEvents[0].timestamp,
      end: agentEvents[agentEvents.length - 1].timestamp,
      events_analyzed: agentEvents.length
    };
    const approvalRate = this._computeApprovalRate(agentEvents);
    const complianceRate = this._computeComplianceRate(agentEvents);
    const stability = this._computeStability(agentEvents);
    const anomalyFactor = this._computeAnomalyFactor(agentEvents);
    const tenure = this._computeTenure(agentEvents);
    const components = {
      approval_rate: approvalRate,
      compliance_rate: complianceRate,
      stability,
      anomaly_factor: anomalyFactor,
      tenure
    };
    const score = Math.round(
      approvalRate.score + complianceRate.score + stability.score + anomalyFactor.score + tenure.score
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
      computed_at: (/* @__PURE__ */ new Date()).toISOString(),
      window
    };
  }
  /**
   * Compute trust scores for all agents in a tenant.
   */
  computeAll(tenantId, events, previousScores) {
    const agentIds = new Set(events.map((e) => e.agent_id));
    return Array.from(agentIds).map(
      (agentId) => this.computeScore(
        agentId,
        tenantId,
        events,
        previousScores?.get(agentId)
      )
    );
  }
  // ─── Component Computations ───
  _computeApprovalRate(events) {
    const intentEvents = events.filter(
      (e) => e.event?.includes("approved") || e.event?.includes("denied") || e.event?.includes("submitted")
    );
    const submitted = intentEvents.filter((e) => e.event?.includes("submitted")).length;
    const approved = intentEvents.filter((e) => e.event?.includes("approved") || e.approved).length;
    const total = Math.max(submitted, approved + intentEvents.filter((e) => e.denied).length);
    if (total === 0) return { score: 15, max: 30, approved: 0, total: 0 };
    const rate = approved / total;
    const score = Math.round(rate * rate * 30);
    return { score, max: 30, approved, total };
  }
  _computeComplianceRate(events) {
    const scopeEvents = events.filter(
      (e) => e.in_scope !== void 0 || e.event?.includes("scope")
    );
    const inScope = scopeEvents.filter((e) => e.in_scope || !e.event?.includes("drift")).length;
    const total = scopeEvents.length;
    if (total === 0) return { score: 12, max: 25, in_scope: 0, total: 0 };
    const rate = inScope / total;
    const score = Math.round(rate * 25);
    return { score, max: 25, in_scope: inScope, total };
  }
  _computeStability(events) {
    const dailyCounts = /* @__PURE__ */ new Map();
    for (const e of events) {
      const day = e.timestamp.split("T")[0];
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    }
    const counts = Array.from(dailyCounts.values());
    if (counts.length <= 1) return { score: 10, max: 20, variance: 0 };
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / counts.length;
    const coeffOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const score = Math.max(0, Math.round(20 * (1 - Math.min(coeffOfVariation / 3, 1))));
    return { score, max: 20, variance: Math.round(variance * 100) / 100 };
  }
  _computeAnomalyFactor(events) {
    const anomalies = events.filter((e) => e.anomaly || e.event?.includes("anomaly"));
    const totalActions = events.filter(
      (e) => e.event?.includes("submitted") || e.event?.includes("intent")
    ).length;
    if (totalActions === 0) return { score: 8, max: 15, anomalies: 0, total_actions: 0 };
    const anomalyRate = anomalies.length / totalActions;
    const score = Math.max(0, Math.round(15 * (1 - Math.min(anomalyRate * 5, 1))));
    const severeAnomalies = anomalies.filter((e) => e.anomaly_severity === "high" || e.anomaly_severity === "critical");
    const severePenalty = severeAnomalies.length * 3;
    return {
      score: Math.max(0, score - severePenalty),
      max: 15,
      anomalies: anomalies.length,
      total_actions: totalActions
    };
  }
  _computeTenure(events) {
    if (events.length === 0) return { score: 0, max: 10, days_active: 0 };
    const first = new Date(events[0].timestamp).getTime();
    const last = new Date(events[events.length - 1].timestamp).getTime();
    const daysActive = Math.ceil((last - first) / (24 * 60 * 60 * 1e3));
    const score = Math.min(10, Math.round(10 * (1 - Math.exp(-daysActive / 60))));
    return { score, max: 10, days_active: daysActive };
  }
  // ─── Classification ───
  _classifyLevel(score) {
    if (score >= 90) return "exemplary";
    if (score >= 70) return "good";
    if (score >= 50) return "watch";
    if (score >= 25) return "probation";
    return "restricted";
  }
  // ─── Recommendations ───
  _generateRecommendation(score, level, components, events) {
    const tierCounts = {};
    for (const e of events) {
      if (e.risk_tier) tierCounts[e.risk_tier] = (tierCounts[e.risk_tier] || 0) + 1;
    }
    const primaryTier = Object.entries(tierCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (level === "exemplary") {
      const tierOrder = ["T3", "T2", "T1", "T0"];
      const currentIdx = primaryTier ? tierOrder.indexOf(primaryTier) : -1;
      const suggestedTier = currentIdx > 0 ? tierOrder[currentIdx - 1] : void 0;
      return {
        action: "relax",
        reason: `Agent has ${score}/100 trust score with ${components.approval_rate.approved}/${components.approval_rate.total} approval rate and ${components.anomaly_factor.anomalies} anomalies. Consider reducing governance overhead.`,
        suggested_tier_change: suggestedTier && primaryTier ? { from: primaryTier, to: suggestedTier } : void 0
      };
    }
    if (level === "good") {
      return {
        action: "maintain",
        reason: `Agent operating within expected parameters. Trust score ${score}/100.`
      };
    }
    if (level === "watch") {
      const issues = [];
      if (components.approval_rate.score < 15) issues.push("low approval rate");
      if (components.anomaly_factor.score < 8) issues.push("elevated anomaly rate");
      if (components.stability.score < 10) issues.push("inconsistent activity pattern");
      return {
        action: "review",
        reason: `Agent needs attention: ${issues.join(", ")}. Trust score ${score}/100.`
      };
    }
    if (level === "probation") {
      return {
        action: "tighten",
        reason: `Agent showing concerning patterns. Trust score ${score}/100. Recommend increasing approval requirements.`,
        suggested_tier_change: primaryTier && primaryTier !== "T3" ? {
          from: primaryTier,
          to: primaryTier === "T0" ? "T1" : primaryTier === "T1" ? "T2" : "T3"
        } : void 0
      };
    }
    return {
      action: "restrict",
      reason: `Agent trust critically low (${score}/100). Recommend manual approval for all actions.`,
      suggested_tier_change: primaryTier ? { from: primaryTier, to: "T3" } : void 0
    };
  }
  // ─── Trend ───
  _computeTrend(currentScore, previousScores) {
    if (previousScores.length === 0) return "stable";
    const recent = previousScores.sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime()).slice(0, 3);
    const avgPrevious = recent.reduce((a, b) => a + b.score, 0) / recent.length;
    const delta = currentScore - avgPrevious;
    if (delta > 5) return "improving";
    if (delta < -5) return "declining";
    return "stable";
  }
  // ─── Empty Score ───
  _emptyScore(agentId, tenantId) {
    return {
      agent_id: agentId,
      tenant_id: tenantId,
      score: 50,
      level: "watch",
      components: {
        approval_rate: { score: 15, max: 30, approved: 0, total: 0 },
        compliance_rate: { score: 12, max: 25, in_scope: 0, total: 0 },
        stability: { score: 10, max: 20, variance: 0 },
        anomaly_factor: { score: 8, max: 15, anomalies: 0, total_actions: 0 },
        tenure: { score: 0, max: 10, days_active: 0 }
      },
      recommendation: {
        action: "review",
        reason: "New agent with no operational history. Monitor initial behavior."
      },
      trend: "stable",
      computed_at: (/* @__PURE__ */ new Date()).toISOString(),
      window: { start: (/* @__PURE__ */ new Date()).toISOString(), end: (/* @__PURE__ */ new Date()).toISOString(), events_analyzed: 0 }
    };
  }
}
var agent_trust_score_default = AgentTrustEngine;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentTrustEngine
});
