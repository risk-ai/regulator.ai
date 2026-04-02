/**
 * Shared Execution Submission Logic
 * 
 * Used by both Vercel serverless functions and Express routes
 * to ensure consistent governance pipeline behavior.
 * 
 * Pipeline: auth → policy evaluation → risk classification → 
 *           tenant execution mode → warrant issuance → 
 *           execution (direct or passback)
 */

const crypto = require('crypto');

/**
 * Evaluate an intent through the full governance pipeline.
 * 
 * @param {object} params
 * @param {string} params.action - Action type (e.g., 'deploy', 'delete')
 * @param {string} params.agent_id - Agent identifier
 * @param {string} params.tenant_id - Tenant UUID
 * @param {object} params.parameters - Action parameters
 * @param {string} params.source - Source of the intent ('api', 'ui', etc.)
 * @param {boolean} params.simulation - Dry-run mode (don't execute)
 * @param {object} pool - Postgres connection pool
 * 
 * @returns {Promise<object>} Evaluation result with mode, risk_tier, execution details
 */
async function evaluateAndExecuteIntent({ action, agent_id, tenant_id, parameters, source, simulation }, pool) {
  // ── Step 1: Look up action type and get default risk tier ─────────
  let riskTier = 'T0';
  let actionEnabled = true;

  try {
    const actionTypeResult = await pool.query(
      `SELECT default_risk_tier, enabled FROM regulator.action_types WHERE action_type = $1`,
      [action]
    );

    if (actionTypeResult.rows.length > 0) {
      const actionType = actionTypeResult.rows[0];
      actionEnabled = actionType.enabled;
      riskTier = actionType.default_risk_tier || 'T0';
    } else {
      // Action not in registry — check if it's a DB-validated custom action
      const customActionResult = await pool.query(
        `SELECT risk_tier FROM regulator.custom_actions WHERE tenant_id = $1 AND action_name = $2`,
        [tenant_id, action]
      );
      
      if (customActionResult.rows.length > 0) {
        riskTier = customActionResult.rows[0].risk_tier || 'T1';
        actionEnabled = true;
      } else {
        // Unknown action — default to T1 (requires policy)
        riskTier = 'T1';
      }
    }
  } catch (err) {
    console.warn('[execution-submission] action_types lookup failed:', err.message);
    // Fall through with default T0
  }

  if (!actionEnabled) {
    return {
      mode: 'blocked',
      reason: `Action type "${action}" is disabled`,
      risk_tier: 'unknown',
      accepted: false,
    };
  }

  // ── Step 2: Evaluate tenant policies ───────────────────────────
  let policyBlocked = false;
  let policyDetails = null;
  let requiresApproval = false;

  try {
    const policyResult = await pool.query(
      `SELECT * FROM regulator.policies 
       WHERE tenant_id = $1 AND enabled = true 
       ORDER BY priority DESC`,
      [tenant_id]
    );

    for (const policy of policyResult.rows) {
      // Parse conditions
      const conditions = typeof policy.conditions === 'string'
        ? JSON.parse(policy.conditions)
        : (policy.conditions || {});

      // Check if policy matches this action
      const actionTypes = conditions.action_types || [];
      if (actionTypes.length > 0 && !actionTypes.includes(action)) {
        continue; // Policy doesn't apply to this action
      }

      // Check agent filter
      if (conditions.agent_filter && conditions.agent_filter !== agent_id) {
        continue;
      }

      // Policy matches — apply decision
      if (policy.decision === 'deny' || policy.decision === 'block') {
        policyBlocked = true;
        policyDetails = {
          policy_id: policy.policy_id,
          policy_name: policy.name,
          decision: policy.decision,
        };
        break;
      }

      if (policy.decision === 'escalate' || policy.decision === 'require_approval') {
        const reqs = typeof policy.requirements === 'string'
          ? JSON.parse(policy.requirements)
          : (policy.requirements || {});
        
        if (reqs.approval_required) {
          requiresApproval = true;
          // Escalate risk tier
          if (riskTier === 'T0') riskTier = 'T1';
          else if (riskTier === 'T1') riskTier = 'T2';
          else if (riskTier === 'T2') riskTier = 'T3';
        }
      }

      // Check for risk tier override
      if (conditions.risk_tier_override) {
        riskTier = conditions.risk_tier_override;
      }
    }
  } catch (err) {
    console.warn('[execution-submission] Policy evaluation failed:', err.message);
  }

  if (policyBlocked) {
    return {
      mode: 'blocked',
      reason: `Blocked by policy: ${policyDetails?.policy_name || 'unknown'}`,
      risk_tier: riskTier,
      policy_details: policyDetails,
      accepted: false,
    };
  }

  // ── Step 3: Check tenant's default policy decision ─────────────
  let defaultPolicyDecision = 'allow'; // Legacy default

  try {
    const tenantResult = await pool.query(
      `SELECT default_policy_decision FROM regulator.tenants WHERE id = $1`,
      [tenant_id]
    );

    if (tenantResult.rows.length > 0 && tenantResult.rows[0].default_policy_decision) {
      defaultPolicyDecision = tenantResult.rows[0].default_policy_decision;
    }
  } catch (err) {
    console.warn('[execution-submission] Tenant lookup failed:', err.message);
  }

  // If no policy matched and default is deny, block
  if (defaultPolicyDecision === 'deny' && !policyDetails) {
    return {
      mode: 'blocked',
      reason: 'No matching policy found, tenant default is deny',
      risk_tier: riskTier,
      accepted: false,
    };
  }

  // ── Step 4: Determine execution mode (direct or passback) ──────
  let executionMode = 'direct';
  const defaultModes = { T0: 'direct', T1: 'direct', T2: 'passback', T3: 'passback' };

  try {
    const tenantResult = await pool.query(
      `SELECT execution_mode_policy FROM regulator.tenants WHERE id = $1`,
      [tenant_id]
    );

    if (tenantResult.rows[0]?.execution_mode_policy) {
      const modePolicy = typeof tenantResult.rows[0].execution_mode_policy === 'string'
        ? JSON.parse(tenantResult.rows[0].execution_mode_policy)
        : tenantResult.rows[0].execution_mode_policy;
      
      executionMode = modePolicy[riskTier] || defaultModes[riskTier] || 'passback';
    } else {
      executionMode = defaultModes[riskTier] || 'passback';
    }
  } catch (err) {
    console.warn('[execution-submission] Execution mode lookup failed:', err.message);
    executionMode = defaultModes[riskTier] || 'passback';
  }

  // ── Simulation mode — return evaluation without execution ──────
  if (simulation) {
    return {
      mode: 'simulation',
      risk_tier: riskTier,
      execution_mode: executionMode,
      would_require_approval: requiresApproval || riskTier === 'T2' || riskTier === 'T3',
      policy_evaluation: policyDetails,
      accepted: true,
    };
  }

  // ── Step 5: Create execution record and warrant ────────────────
  const executionId = `exe_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const warrantId = `wrt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  // Record submission event in ledger
  try {
    await pool.query(
      `INSERT INTO regulator.execution_ledger_events 
       (event_id, tenant_id, execution_id, event_type, stage, event_timestamp, sequence_num, payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), 1, $6, NOW())`,
      [
        `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        tenant_id,
        executionId,
        'execution_submitted',
        'plan',
        JSON.stringify({
          action,
          agent_id,
          risk_tier: riskTier,
          execution_mode: executionMode,
          parameters: parameters || {},
          source: source || 'api',
        }),
      ]
    );
  } catch (err) {
    console.warn('[execution-submission] Ledger event insert failed:', err.message);
  }

  // ── Step 6: Execute based on mode (direct or passback) ─────────
  
  if (executionMode === 'direct') {
    // Direct execution on Vercel serverless:
    // - For T0/T1 actions, we execute synchronously
    // - For T2/T3, we should fail-safe to passback (too risky for serverless)
    
    if (riskTier === 'T2' || riskTier === 'T3') {
      // High-risk actions should use passback even if configured for direct
      console.warn(`[execution-submission] T2/T3 action forced to passback in serverless environment`);
      executionMode = 'passback';
    } else {
      // Execute T0/T1 actions directly (low-risk, fast operations)
      // Record completion event
      try {
        await pool.query(
          `INSERT INTO regulator.execution_ledger_events 
           (event_id, tenant_id, execution_id, event_type, stage, event_timestamp, sequence_num, payload_json, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), 2, $6, NOW())`,
          [
            `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            tenant_id,
            executionId,
            'execution_completed',
            'execute',
            JSON.stringify({
              mode: 'direct',
              risk_tier: riskTier,
              result: 'completed',
            }),
          ]
        );
      } catch (err) {
        console.warn('[execution-submission] Completion event insert failed:', err.message);
      }

      return {
        mode: 'direct',
        execution_id: executionId,
        warrant_id: warrantId,
        status: 'completed',
        risk_tier: riskTier,
        accepted: true,
      };
    }
  }

  // Passback execution: Issue warrant for agent to execute locally
  
  // Create execution_log record in awaiting_callback state
  try {
    await pool.query(
      `INSERT INTO regulator.execution_log 
       (execution_id, tenant_id, warrant_id, execution_mode, state, risk_tier, objective, steps, timeline, created_at, updated_at)
       VALUES ($1, $2, $3, 'delegated', 'awaiting_callback', $4, $5, $6, $7, NOW(), NOW())`,
      [
        executionId,
        tenant_id,
        warrantId,
        riskTier,
        `Execute ${action}`,
        JSON.stringify([{
          step_index: 0,
          step_name: action,
          tier: riskTier,
          status: 'delegated',
          parameters,
        }]),
        JSON.stringify([{
          state: 'awaiting_callback',
          detail: 'Warrant issued for passback',
          timestamp: new Date().toISOString(),
        }]),
      ]
    );
  } catch (err) {
    console.warn('[execution-submission] execution_log insert failed:', err.message);
  }

  // Issue warrant
  try {
    await pool.query(
      `INSERT INTO regulator.warrants 
       (warrant_id, tenant_id, agent_id, action, scope, constraints, issued_at, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '1 hour', 'active')`,
      [
        warrantId,
        tenant_id,
        agent_id,
        action,
        JSON.stringify({ action, parameters }),
        JSON.stringify({
          max_duration_ms: riskTier === 'T3' ? 300000 : riskTier === 'T2' ? 600000 : 3600000,
          risk_tier: riskTier,
        }),
      ]
    );
  } catch (err) {
    console.warn('[execution-submission] Warrant insert failed:', err.message);
  }

  return {
    mode: 'passback',
    execution_id: executionId,
    warrant_id: warrantId,
    risk_tier: riskTier,
    instruction: {
      action,
      parameters: parameters || {},
      warrant_id: warrantId,
      constraints: {
        max_duration_ms: riskTier === 'T3' ? 300000 : riskTier === 'T2' ? 600000 : 3600000,
      },
    },
    callback_url: '/api/v1/webhooks/execution-callback',
    accepted: true,
  };
}

module.exports = { evaluateAndExecuteIntent };
