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
var policy_simulator_exports = {};
__export(policy_simulator_exports, {
  PolicySimulator: () => PolicySimulator,
  default: () => policy_simulator_default
});
module.exports = __toCommonJS(policy_simulator_exports);
class PolicySimulator {
  /**
   * Run a policy simulation.
   * Replays historical intents against proposed policies.
   */
  simulate(options) {
    const startTime = Date.now();
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { intents, proposedPolicies } = options;
    const decisions = [];
    for (const intent of intents) {
      const simulated = this._evaluateIntent(intent, proposedPolicies);
      const change = this._classifyChange(intent, simulated);
      decisions.push({
        intent_id: intent.intent_id,
        agent_id: intent.agent_id,
        action: intent.action,
        risk_tier: intent.risk_tier,
        timestamp: intent.timestamp,
        actual_decision: intent.actual_decision,
        simulated_decision: simulated.decision,
        actual_approval_required: intent.actual_approval_required,
        simulated_approval_required: simulated.approval_required,
        change,
        matched_policy_id: simulated.matched_policy_id,
        reason: simulated.reason
      });
    }
    const summary = this._buildSummary(decisions);
    const timeWindow = this._getTimeWindow(intents);
    return {
      simulation_id: simulationId,
      proposed_policies: proposedPolicies,
      time_window: timeWindow,
      total_intents: intents.length,
      summary,
      decisions,
      simulated_at: (/* @__PURE__ */ new Date()).toISOString(),
      simulation_time_ms: Date.now() - startTime
    };
  }
  // ─── Intent Evaluation ───
  _evaluateIntent(intent, policies) {
    const matched = policies.filter((p) => p.enabled && this._policyMatchesIntent(p, intent));
    if (matched.length === 0) {
      return {
        decision: intent.actual_decision === "denied" ? "denied" : "approved",
        approval_required: intent.actual_approval_required,
        matched_policy_id: null,
        reason: "No matching policy found \u2014 preserving actual decision (no policy coverage)"
      };
    }
    const denyPolicies = matched.filter((p) => p.decision === "deny");
    if (denyPolicies.length > 0) {
      const winner2 = denyPolicies.reduce((a, b) => a.priority > b.priority ? a : b);
      return {
        decision: "denied",
        approval_required: false,
        matched_policy_id: winner2.policy_id,
        reason: `Denied by policy ${winner2.policy_id}: ${winner2.description || "no description"}`
      };
    }
    const winner = matched.reduce((a, b) => a.priority > b.priority ? a : b);
    if (winner.decision === "require_approval") {
      return {
        decision: "pending",
        approval_required: true,
        matched_policy_id: winner.policy_id,
        reason: `Requires approval per policy ${winner.policy_id}`
      };
    }
    const approvalRequired = winner.requirements?.approval_required || false;
    return {
      decision: approvalRequired ? "pending" : "approved",
      approval_required: approvalRequired,
      matched_policy_id: winner.policy_id,
      reason: approvalRequired ? `Allowed with approval per policy ${winner.policy_id}` : `Allowed by policy ${winner.policy_id}`
    };
  }
  _policyMatchesIntent(policy, intent) {
    const { scope } = policy;
    if (scope.objective) {
      const objectives = Array.isArray(scope.objective) ? scope.objective : [scope.objective];
      if (!objectives.includes(intent.action) && !objectives.includes("*")) {
        return false;
      }
    }
    if (scope.risk_tier) {
      const tiers = Array.isArray(scope.risk_tier) ? scope.risk_tier : [scope.risk_tier];
      if (!tiers.includes(intent.risk_tier)) {
        return false;
      }
    }
    if (scope.actor_type) {
      const actors = Array.isArray(scope.actor_type) ? scope.actor_type : [scope.actor_type];
      const agentType = intent.details?.actor_type || "agent";
      if (!actors.includes(agentType) && !actors.includes("*")) {
        return false;
      }
    }
    return true;
  }
  // ─── Change Classification ───
  _classifyChange(intent, simulated) {
    const wasApproved = intent.actual_decision === "approved";
    const wasDenied = intent.actual_decision === "denied";
    const wasPending = intent.actual_decision === "pending";
    const wouldApprove = simulated.decision === "approved";
    const wouldDeny = simulated.decision === "denied" || simulated.decision === "deny";
    const wouldPend = simulated.decision === "pending";
    if (wasApproved && wouldDeny) return "would_block";
    if (wasDenied && wouldApprove) return "would_allow";
    if (wasApproved && !intent.actual_approval_required && simulated.approval_required) {
      return "would_require_approval";
    }
    if ((wasPending || intent.actual_approval_required) && wouldApprove && !simulated.approval_required) {
      return "would_remove_approval";
    }
    return "no_change";
  }
  // ─── Summary ───
  _buildSummary(decisions) {
    const counts = {
      no_change: 0,
      would_block: 0,
      would_allow: 0,
      would_require_approval: 0,
      would_remove_approval: 0,
      tier_change: 0
    };
    for (const d of decisions) {
      counts[d.change]++;
    }
    const riskFactors = [];
    let riskScore = "safe";
    if (counts.would_block > 0) {
      riskFactors.push(`${counts.would_block} previously approved actions would be BLOCKED`);
      if (counts.would_block > decisions.length * 0.1) {
        riskScore = "high";
      } else {
        riskScore = riskScore === "safe" ? "moderate" : riskScore;
      }
    }
    if (counts.would_allow > 0) {
      riskFactors.push(`${counts.would_allow} previously denied actions would be ALLOWED`);
      riskScore = "high";
    }
    if (counts.would_remove_approval > 0) {
      riskFactors.push(`${counts.would_remove_approval} actions would no longer require approval`);
      riskScore = riskScore === "safe" ? "moderate" : riskScore;
    }
    if (counts.would_require_approval > 0) {
      riskFactors.push(`${counts.would_require_approval} actions would now require approval (may slow operations)`);
    }
    if (counts.would_allow > decisions.length * 0.05) {
      riskScore = "critical";
    }
    let recommendation;
    let recommendationReason;
    if (riskScore === "safe") {
      recommendation = "deploy";
      recommendationReason = "No significant impact detected. Safe to deploy.";
    } else if (riskScore === "moderate") {
      recommendation = "review";
      recommendationReason = "Moderate impact detected. Review changed decisions before deploying.";
    } else if (riskScore === "critical") {
      recommendation = "reject";
      recommendationReason = `Critical: ${counts.would_allow} previously denied actions would be allowed. This significantly weakens governance.`;
    } else {
      recommendation = "review";
      recommendationReason = `${counts.would_block} approved actions would be blocked. Verify this is intentional.`;
    }
    if (decisions.length === 0) {
      recommendation = "deploy";
      recommendationReason = "No historical data to simulate against. Deploy and monitor.";
    }
    return {
      no_change: counts.no_change,
      would_block: counts.would_block,
      would_allow: counts.would_allow,
      would_require_approval: counts.would_require_approval,
      would_remove_approval: counts.would_remove_approval,
      risk_score: riskScore,
      risk_factors: riskFactors,
      recommendation,
      recommendation_reason: recommendationReason
    };
  }
  // ─── Helpers ───
  _getTimeWindow(intents) {
    if (intents.length === 0) {
      return { from: (/* @__PURE__ */ new Date()).toISOString(), to: (/* @__PURE__ */ new Date()).toISOString() };
    }
    const sorted = intents.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return {
      from: sorted[0].timestamp,
      to: sorted[sorted.length - 1].timestamp
    };
  }
}
var policy_simulator_default = PolicySimulator;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PolicySimulator
});
