/**
 * Simulation/Sandbox API — Dry-Run Governance Testing
 * 
 * Test proposals against policies without real execution.
 * Returns policy evaluation results, risk tiers, and approval requirements.
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth, pool } = require('./_auth');
const { captureException } = require('../../lib/sentry');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/simulation/, '');

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // ── Run simulation ────────────────────────────────────────────────
    if (req.method === 'POST' && path === '/run') {
      const { agent_id, action_type, payload } = req.body;

      if (!agent_id || !action_type || !payload) {
        return res.status(400).json({
          success: false,
          error: 'agent_id, action_type, and payload required',
        });
      }

      // Verify agent exists
      const agentResult = await pool.query(`
        SELECT agent_id, display_name, trust_score, status
        FROM agent_registry
        WHERE agent_id = $1 AND tenant_id = $2
      `, [agent_id, tenantId]);

      if (agentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const agent = agentResult.rows[0];

      // Get all active policies for this tenant
      const policiesResult = await pool.query(`
        SELECT id, name, description, conditions, actions, priority, enabled
        FROM policy_rules
        WHERE tenant_id = $1 AND enabled = true
        ORDER BY priority DESC
      `, [tenantId]);

      const policies = policiesResult.rows;

      // Evaluate each policy
      const evaluations = [];
      let highestRiskTier = 'T0';
      let finalDecision = 'auto_approve';

      for (const policy of policies) {
        const evaluation = evaluatePolicy(policy, {
          agent,
          action_type,
          payload,
        });

        evaluations.push({
          policy_id: policy.id,
          policy_name: policy.name,
          result: evaluation.result,
          conditions_matched: evaluation.conditions_matched,
          risk_tier: evaluation.risk_tier,
        });

        // Update final decision based on strictest policy
        if (evaluation.result === 'deny') {
          finalDecision = 'denied';
        } else if (evaluation.result === 'require_approval' && finalDecision !== 'denied') {
          finalDecision = 'requires_approval';
        }

        // Track highest risk tier
        if (compareRiskTiers(evaluation.risk_tier, highestRiskTier) > 0) {
          highestRiskTier = evaluation.risk_tier;
        }
      }

      // Calculate approval requirements
      let approvalRequirements = null;
      if (finalDecision === 'requires_approval') {
        approvalRequirements = {
          required_tier: highestRiskTier,
          approvers_needed: getApproversNeeded(highestRiskTier),
          suggested_approvers: await getSuggestedApprovers(tenantId, highestRiskTier),
        };
      }

      // Generate warnings
      const warnings = [];
      if (agent.status !== 'active') {
        warnings.push(`Agent status is "${agent.status}" - may not be able to execute in production`);
      }
      if (agent.trust_score < 50) {
        warnings.push(`Low trust score (${agent.trust_score}) - high-risk actions may be blocked`);
      }
      if (evaluations.length === 0) {
        warnings.push('No policies matched - action will be auto-approved by default');
      }

      return res.json({
        success: true,
        data: {
          policy_evaluations: evaluations,
          final_decision: finalDecision,
          risk_tier: highestRiskTier,
          approval_requirements: approvalRequirements,
          estimated_duration: estimateDuration(finalDecision, highestRiskTier),
          warnings,
        },
      });
    }

    // ── Get simulation status ─────────────────────────────────────────
    if (req.method === 'GET' && path === '/status') {
      const result = await pool.query(`
        SELECT
          COUNT(*) AS total_policies,
          COUNT(*) FILTER (WHERE enabled = true) AS active_policies,
          (SELECT COUNT(*) FROM agent_registry WHERE tenant_id = $1) AS total_agents
        FROM policy_rules
        WHERE tenant_id = $1
      `, [tenantId]);

      return res.json({
        success: true,
        data: {
          ...result.rows[0],
          simulation_enabled: true,
          mode: 'dry_run',
        },
      });
    }

    return res.status(404).json({ success: false, error: 'Not found' });

  } catch (error) {
    captureException(error, { tags: { endpoint: 'simulation' } });
    console.error('Simulation API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ── Policy Evaluation Logic ──────────────────────────────────────────

function evaluatePolicy(policy, context) {
  const { agent, action_type, payload } = context;
  const conditions = policy.conditions || {};
  const actions = policy.actions || {};

  const conditionsMatched = [];
  let result = 'allow';
  let riskTier = 'T0';

  // Check action_type match
  if (conditions.action_types && conditions.action_types.includes(action_type)) {
    conditionsMatched.push('action_type');
  }

  // Check agent trust score
  if (conditions.min_trust_score !== undefined) {
    if (agent.trust_score >= conditions.min_trust_score) {
      conditionsMatched.push('trust_score');
    }
  }

  // Check agent ID match
  if (conditions.agent_ids && conditions.agent_ids.includes(agent.agent_id)) {
    conditionsMatched.push('agent_id');
  }

  // Check payload conditions (basic matching)
  if (conditions.payload_conditions) {
    for (const [key, value] of Object.entries(conditions.payload_conditions)) {
      if (payload[key] === value) {
        conditionsMatched.push(`payload.${key}`);
      }
    }
  }

  // Determine result based on actions
  if (actions.action === 'deny') {
    result = 'deny';
    riskTier = 'T3';
  } else if (actions.action === 'require_approval') {
    result = 'require_approval';
    riskTier = actions.risk_tier || 'T1';
  } else if (actions.action === 'allow') {
    result = 'allow';
    riskTier = actions.risk_tier || 'T0';
  }

  return {
    result,
    conditions_matched: conditionsMatched,
    risk_tier: riskTier,
  };
}

function compareRiskTiers(tier1, tier2) {
  const order = { T0: 0, T1: 1, T2: 2, T3: 3 };
  return order[tier1] - order[tier2];
}

function getApproversNeeded(riskTier) {
  const counts = { T0: 0, T1: 1, T2: 2, T3: 3 };
  return counts[riskTier] || 1;
}

async function getSuggestedApprovers(tenantId, riskTier) {
  // In a real system, query RBAC roles
  // For now, return placeholder
  return ['admin@company.com', 'security@company.com'];
}

function estimateDuration(decision, riskTier) {
  if (decision === 'auto_approve') return 'Instant';
  if (decision === 'denied') return 'N/A (blocked)';
  
  const durations = {
    T1: '5-15 minutes',
    T2: '30-60 minutes',
    T3: '2-4 hours',
  };
  return durations[riskTier] || '15-30 minutes';
}
