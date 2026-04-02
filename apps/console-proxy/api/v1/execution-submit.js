/**
 * Execution Submit API — Consolidated Endpoint
 * 
 * Gap #3 Fix: This Vercel serverless function uses the shared execution-submission
 * library to ensure consistent governance pipeline behavior across all environments.
 * 
 * Pipeline: auth → policy evaluation → risk classification → 
 *           tenant execution mode → warrant issuance → 
 *           execution (direct or passback)
 * 
 * TENANT-ISOLATED: All operations scoped to authenticated tenant
 */

const { requireAuth, pool } = require('./_auth');
const { trackUsage } = require('../../lib/usage');
const { captureException } = require('../../lib/sentry');
const { evaluateAndExecuteIntent } = require('../../lib/execution-submission');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    const { action, agent_id, parameters, source, simulation } = req.body;

    if (!action || !agent_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, agent_id',
        code: 'INVALID_REQUEST',
        timestamp: new Date().toISOString(),
      });
    }

    // ── Use shared governance pipeline logic ──────────────────────
    const result = await evaluateAndExecuteIntent({
      action,
      agent_id,
      tenant_id: tenantId,
      parameters,
      source,
      simulation,
    }, pool);

    // Track usage
    trackUsage(tenantId, 'policy_evaluations');

    // Return result based on mode
    if (!result.accepted) {
      // Policy blocked
      return res.status(403).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    if (result.mode === 'simulation') {
      // Simulation mode
      return res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    if (result.mode === 'direct') {
      // Direct execution completed
      return res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    if (result.mode === 'passback') {
      // Passback — warrant issued for agent to execute
      return res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback — should never reach here
    return res.status(500).json({
      success: false,
      error: 'Unknown execution result mode',
      code: 'UNKNOWN_MODE',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[execution-submit]', error);
    captureException(error, { endpoint: 'execution-submit', tenantId });
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'EXECUTION_SUBMIT_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};
