/**
 * Framework Integration API — v1
 * 
 * REST endpoints for external agent frameworks (LangChain, CrewAI, AutoGen,
 * OpenClaw, Google ADK, OpenAI Agents SDK) to interact with Vienna OS.
 * 
 * These endpoints are consumed by the FrameworkAdapter client library.
 * Authentication via Bearer token (API key with vos_ prefix).
 */

import express from 'express';
import { eventBus } from '../services/eventBus.js';

const router = express.Router();

// --- Middleware ---

/**
 * API key authentication middleware
 * Expects: Authorization: Bearer vos_xxx
 */
function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer vos_')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid API key. Expected: Bearer vos_xxx'
    });
  }

  const apiKey = authHeader.slice(7);
  // TODO: Validate API key against tenant database
  // For now, accept any vos_ prefixed key
  (req as any).apiKey = apiKey;
  (req as any).agentId = req.headers['x-vienna-agent'] || 'unknown';
  (req as any).framework = req.headers['x-vienna-framework'] || 'unknown';
  
  next();
}

router.use(apiKeyAuth);

// --- Intent Submission ---

/**
 * POST /api/v1/intents
 * Submit an intent for governance evaluation.
 * 
 * Body:
 * {
 *   agent_id: string,
 *   framework: string,
 *   action: string,
 *   params: object,
 *   objective: string,
 *   metadata: object
 * }
 * 
 * Returns:
 * {
 *   intent_id: string,
 *   status: 'approved' | 'pending' | 'denied',
 *   risk_tier: 'T0' | 'T1' | 'T2' | 'T3',
 *   warrant_id?: string,       // Present if auto-approved (T0/T1)
 *   warrant?: object,          // Full warrant if auto-approved
 *   reason?: string,           // Denial reason
 *   approval_url?: string      // URL for T2/T3 manual approval
 * }
 */
router.post('/intents', async (req, res) => {
  try {
    const { agent_id, framework, action, params, objective, metadata } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    const intentId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();
    
    // Extract tenant_id from API key or headers (for now, use default)
    const tenantId = (req.headers['x-vienna-tenant'] as string) || 'default';

    // Emit intent submitted event
    eventBus.emitIntentSubmitted({
      intent_id: intentId,
      agent_id: agent_id || 'unknown',
      action,
      risk_tier: 'unknown' // Will be updated below
    }, tenantId);

    // Classify risk tier
    const RiskTier = require('@vienna/lib/governance/risk-tier');
    const riskTierClassifier = new RiskTier();
    const riskTier = riskTierClassifier.classify({
      action,
      ...params,
      ...metadata
    });
    const requirements = riskTierClassifier.getRequirements(riskTier);

    // T0/T1: Auto-approve, issue warrant immediately
    if (!requirements.approval_required) {
      const warrantId = `wrt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const maxTtl = requirements.max_ttl_minutes || 60;
      const expiresAt = new Date(Date.now() + maxTtl * 60 * 1000).toISOString();

      // Emit intent approved event
      eventBus.emitIntentApproved({
        intent_id: intentId,
        warrant_id: warrantId,
        approved_by: 'system_auto',
        risk_tier: riskTier
      }, tenantId);

      // Emit warrant issued event
      eventBus.emitWarrantIssued({
        warrant_id: warrantId,
        intent_id: intentId,
        agent_id: agent_id || 'unknown',
        expires_at: expiresAt,
        risk_tier: riskTier
      }, tenantId);

      // TODO: Issue real warrant via Warrant Authority
      // For now, return structured response
      return res.json({
        success: true,
        intent_id: intentId,
        status: 'approved',
        risk_tier: riskTier,
        warrant_id: warrantId,
        warrant: {
          warrant_id: warrantId,
          issued_at: timestamp,
          expires_at: expiresAt,
          risk_tier: riskTier,
          allowed_actions: [action],
          agent_id,
          framework
        }
      });
    }

    // T2/T3: Requires human approval — queue for review
    const approvalId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const approvalExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry
    
    // Emit approval required event
    eventBus.emitApprovalRequired({
      approval_id: approvalId,
      intent_id: intentId,
      risk_tier: riskTier,
      required_approvers: requirements.approval_count,
      expires_at: approvalExpiresAt
    }, tenantId);

    return res.status(202).json({
      success: true,
      intent_id: intentId,
      status: 'pending',
      risk_tier: riskTier,
      approval_id: approvalId,
      approval_required: requirements.approval_count,
      message: `${riskTier} action requires ${requirements.approval_count} approval(s)`,
      poll_url: `/api/v1/intents/${intentId}`,
      created_at: timestamp
    });

  } catch (error: any) {
    console.error('[Framework API] Intent submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Intent Status ---

/**
 * GET /api/v1/intents/:intentId
 * Check status of a submitted intent.
 */
router.get('/intents/:intentId', async (req, res) => {
  try {
    const { intentId } = req.params;
    
    // TODO: Look up intent from state graph
    // For now, return mock
    res.json({
      success: true,
      intent_id: intentId,
      status: 'pending',
      message: 'Awaiting approval'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Execution Reporting ---

/**
 * POST /api/v1/executions
 * Report execution result after warrant-authorized action completes.
 * 
 * Body:
 * {
 *   warrant_id: string,
 *   agent_id: string,
 *   success: boolean,
 *   output?: string,
 *   error?: string,
 *   metrics?: object
 * }
 */
router.post('/executions', async (req, res) => {
  try {
    const { warrant_id, agent_id, success, output, error, metrics } = req.body;

    if (!warrant_id) {
      return res.status(400).json({ success: false, error: 'warrant_id is required' });
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tenantId = (req.headers['x-vienna-tenant'] as string) || 'default';
    const timestamp = new Date().toISOString();

    // Emit execution started event
    eventBus.emitExecutionStarted({
      execution_id: executionId,
      warrant_id,
      agent_id: agent_id || 'unknown',
      action: 'unknown' // Could be extracted from warrant lookup
    }, tenantId);

    // Emit execution completed event
    eventBus.emitExecutionCompleted({
      execution_id: executionId,
      warrant_id,
      duration_ms: metrics?.duration_ms || 0,
      success: success || false,
      output
    }, tenantId);

    // TODO: Verify warrant is valid, record execution in audit ledger
    // TODO: Run verification engine to confirm execution matched warrant scope

    res.json({
      success: true,
      execution_id: executionId,
      warrant_id,
      recorded: true,
      verified: true, // TODO: actual verification
      timestamp
    });
  } catch (error: any) {
    console.error('[Framework API] Execution report error:', error);
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

// --- Agent Management ---

/**
 * POST /api/v1/agents
 * Register an agent with Vienna OS.
 */
router.post('/agents', async (req, res) => {
  try {
    const { agent_id, framework, name, capabilities, config } = req.body;

    if (!agent_id || !name) {
      return res.status(400).json({ success: false, error: 'agent_id and name are required' });
    }

    const tenantId = (req.headers['x-vienna-tenant'] as string) || 'default';
    const timestamp = new Date().toISOString();

    // Emit agent registered event
    eventBus.emitAgentRegistered({
      agent_id,
      framework: framework || 'unknown',
      capabilities: capabilities || []
    }, tenantId);

    // TODO: Store in state graph
    res.status(201).json({
      success: true,
      agent_id,
      registered: true,
      framework,
      capabilities: capabilities || [],
      registered_at: timestamp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/agents/:agentId/heartbeat
 * Agent heartbeat — confirms agent is alive and operational.
 */
router.post('/agents/:agentId/heartbeat', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;
    
    const tenantId = (req.headers['x-vienna-tenant'] as string) || 'default';
    const timestamp = new Date().toISOString();

    // Emit agent heartbeat event
    eventBus.emitAgentHeartbeat({
      agent_id: agentId,
      status: status || 'healthy',
      last_seen: timestamp
    }, tenantId);

    // TODO: Update agent last_seen in state graph
    res.json({
      success: true,
      agent_id: agentId,
      acknowledged: true,
      server_time: timestamp
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Warrants ---

/**
 * GET /api/v1/warrants/:warrantId
 * Verify a warrant's validity and scope.
 */
router.get('/warrants/:warrantId', async (req, res) => {
  try {
    const { warrantId } = req.params;

    // TODO: Look up warrant from Warrant Authority
    res.json({
      success: true,
      warrant_id: warrantId,
      valid: true, // TODO: actual validation
      message: 'Warrant verification endpoint (pending full implementation)'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Policies ---

/**
 * GET /api/v1/policies
 * List active policies visible to this agent.
 */
router.get('/policies', async (req, res) => {
  try {
    // TODO: Filter policies by tenant/agent scope
    res.json({
      success: true,
      policies: [],
      message: 'Policy listing endpoint (pending full implementation)'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
