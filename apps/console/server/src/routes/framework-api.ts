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
import crypto from 'crypto';
import { eventBus } from '../services/eventBus.js';
import { queryOne } from '../db/postgres.js';

const router = express.Router();

// --- Middleware ---

/**
 * API key authentication middleware
 * Validates vos_ prefixed keys against the api_keys table.
 * Expects: Authorization: Bearer vos_xxx
 */
async function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer vos_')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid API key. Expected: Bearer vos_xxx'
    });
  }

  const apiKey = authHeader.slice(7);
  
  // Validate against database
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 8);
    
    const record = await queryOne<{
      id: string;
      tenant_id: string;
      scopes: string[];
      agent_id: string | null;
      rate_limit: number;
      revoked_at: string | null;
      expires_at: string | null;
    }>(
      `SELECT id, tenant_id, scopes, agent_id, rate_limit, revoked_at, expires_at
       FROM api_keys
       WHERE key_prefix = $1 AND key_hash = $2`,
      [keyPrefix, keyHash]
    );
    
    if (!record || record.revoked_at || (record.expires_at && new Date(record.expires_at) < new Date())) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key'
      });
    }
    
    (req as any).apiKey = apiKey;
    (req as any).tenantId = record.tenant_id;
    (req as any).apiKeyScopes = record.scopes;
    (req as any).agentId = req.headers['x-vienna-agent'] || record.agent_id || 'unknown';
    (req as any).framework = req.headers['x-vienna-framework'] || 'unknown';
    
    next();
  } catch (err) {
    console.error('[FrameworkAPI] API key validation error:', err);
    return res.status(500).json({
      success: false,
      error: 'API key validation failed'
    });
  }
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
    
    // Extract tenant_id from authenticated API key (set by apiKeyAuth middleware)
    const tenantId = (req as any).tenantId || 'default';

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
      const maxTtl = requirements.max_ttl_minutes || 60;

      // Issue real warrant via Warrant Authority
      try {
        const viennaCore = (req as any).app?.locals?.viennaCore;
        if (!viennaCore || !viennaCore.warrant) {
          throw new Error('Warrant Authority not available');
        }

        const warrant = await viennaCore.warrant.issue({
          truthSnapshotId: `truth_${intentId}`,
          planId: intentId,
          objective: `${action} (auto-approved ${riskTier})`,
          riskTier: riskTier,
          allowedActions: [action],
          forbiddenActions: [],
          constraints: params || {},
          expiresInMinutes: maxTtl,
          issuer: agent_id || 'framework_api',
        });

        const warrantId = warrant.warrant_id;
        const expiresAt = warrant.expires_at;

        console.log(`[framework-api] Real warrant issued: ${warrantId} for intent ${intentId} (${riskTier})`);

        // Emit intent approved event
        eventBus.emitIntentApproved({
          intent_id: intentId,
          warrant_id: warrantId,
          approved_by: 'system_auto',
          risk_tier: riskTier
        }, tenantId);

        // Warrant issued event already emitted by WarrantAdapter
        // No need to emit again here

        return res.json({
          success: true,
          intent_id: intentId,
          status: 'approved',
          risk_tier: riskTier,
          warrant_id: warrantId,
          warrant: {
            warrant_id: warrantId,
            issued_at: warrant.issued_at,
            expires_at: expiresAt,
            risk_tier: riskTier,
            allowed_actions: warrant.allowed_actions,
            signature: warrant.signature,
            agent_id,
            framework
          }
        });
      } catch (error: any) {
        console.error('[framework-api] Warrant issuance failed:', error);
        
        // Fallback to synthetic warrant (graceful degradation)
        const warrantId = `wrt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const expiresAt = new Date(Date.now() + maxTtl * 60 * 1000).toISOString();
        
        console.warn(`[framework-api] Falling back to synthetic warrant ${warrantId} (Warrant Authority error: ${error.message})`);

        eventBus.emitIntentApproved({
          intent_id: intentId,
          warrant_id: warrantId,
          approved_by: 'system_auto',
          risk_tier: riskTier
        }, tenantId);

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
            framework,
            _fallback: true,
            _error: error.message
          }
        });
      }
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
    const tenantId = (req as any).tenantId || 'default';
    
    // Check audit log for this intent's latest state
    const auditEntry = await queryOne<{ event: string; details: any; created_at: string }>(
      `SELECT event, details, created_at FROM audit_log
       WHERE details->>'intent_id' = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [intentId, tenantId]
    );
    
    if (!auditEntry) {
      return res.status(404).json({
        success: false,
        error: 'Intent not found',
        intent_id: intentId
      });
    }
    
    // Map audit event to intent status
    const statusMap: Record<string, string> = {
      'intent.approved': 'approved',
      'intent.denied': 'denied',
      'intent.submitted': 'pending',
      'approval.required': 'pending',
    };
    
    res.json({
      success: true,
      intent_id: intentId,
      status: statusMap[auditEntry.event] || 'pending',
      details: auditEntry.details,
      last_updated: auditEntry.created_at
    });
  } catch (error: any) {
    // If audit_log table doesn't exist yet, return a graceful fallback
    res.json({
      success: true,
      intent_id: req.params.intentId,
      status: 'unknown',
      message: 'Intent tracking in progress'
    });
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
    const tenantId = (req as any).tenantId || 'default';
    const timestamp = new Date().toISOString();

    // Emit execution started event
    eventBus.emitExecutionStarted({
      execution_id: executionId,
      warrant_id,
      agent_id: agent_id || 'unknown',
      action: 'reported' 
    }, tenantId);

    // Emit execution completed event
    eventBus.emitExecutionCompleted({
      execution_id: executionId,
      warrant_id,
      duration_ms: metrics?.duration_ms || 0,
      success: success || false,
      output
    }, tenantId);

    // Record in audit log
    try {
      await queryOne(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, $2, $3, $4, 0, NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          tenantId,
          success ? 'execution.completed' : 'execution.failed',
          agent_id || 'unknown',
          JSON.stringify({ execution_id: executionId, warrant_id, success, output, error, metrics }),
        ]
      );
    } catch (auditErr) {
      console.warn('[Framework API] Audit log write failed:', auditErr);
    }

    res.json({
      success: true,
      execution_id: executionId,
      warrant_id,
      recorded: true,
      verified: false, // Warrant scope verification not yet implemented
      verification_note: 'Execution recorded. Full warrant scope verification is planned.',
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

    const tenantId = (req as any).tenantId || 'default';
    const timestamp = new Date().toISOString();

    // Emit agent registered event
    eventBus.emitAgentRegistered({
      agent_id,
      framework: framework || 'unknown',
      capabilities: capabilities || []
    }, tenantId);

    // FIXME(state-graph): Persist agent registration in state graph
    console.warn(`[framework-api] Agent ${agent_id} registered but not persisted to state graph`);
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
    
    const tenantId = (req as any).tenantId || 'default';
    const timestamp = new Date().toISOString();

    // Emit agent heartbeat event
    eventBus.emitAgentHeartbeat({
      agent_id: agentId,
      status: status || 'healthy',
      last_seen: timestamp
    }, tenantId);

    // FIXME(state-graph): Update agent last_seen in state graph
    console.warn(`[framework-api] Agent ${agentId} heartbeat received but last_seen not persisted`);
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
    const tenantId = (req as any).tenantId || 'default';

    // Use real Warrant Authority verification
    const viennaCore = (req as any).app?.locals?.viennaCore;
    if (!viennaCore || !viennaCore.warrant) {
      return res.status(503).json({
        success: false,
        error: 'Warrant Authority not available'
      });
    }

    const verification = await viennaCore.warrant.verify(warrantId);

    if (!verification.valid) {
      return res.json({
        success: true,
        warrant_id: warrantId,
        valid: false,
        reason: verification.reason,
        invalidated_at: verification.invalidated_at,
        invalidation_reason: verification.invalidation_reason,
      });
    }

    // Load full warrant details
    const warrant = await viennaCore.warrant.adapter.loadWarrant(warrantId);
    
    if (!warrant) {
      return res.status(404).json({
        success: false,
        error: 'Warrant not found'
      });
    }

    const now = new Date();
    const expired = new Date(warrant.expires_at) < now;

    res.json({
      success: true,
      warrant_id: warrantId,
      valid: !expired && warrant.status === 'issued',
      expired,
      status: warrant.status,
      expires_at: warrant.expires_at,
      issued_at: warrant.issued_at,
      risk_tier: warrant.risk_tier,
      allowed_actions: warrant.allowed_actions,
      constraints: warrant.constraints,
      signature: warrant.signature,
    });
  } catch (error: any) {
    console.error('[framework-api] Warrant verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Warrant verification failed',
      message: error.message
    });
  }
});

// --- Policies ---

/**
 * GET /api/v1/policies
 * List active policies visible to this agent.
 */
router.get('/policies', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId || 'default';
    
    const { query: queryDb } = await import('../db/postgres.js');
    const policies = await queryDb<{
      id: string;
      name: string;
      description: string | null;
      enabled: boolean;
      priority: number;
    }>(
      `SELECT id, name, description, enabled, priority
       FROM policies WHERE tenant_id = $1 AND enabled = true
       ORDER BY priority ASC`,
      [tenantId]
    );
    
    res.json({
      success: true,
      policies: policies || [],
      count: (policies || []).length
    });
  } catch (error: any) {
    // Graceful fallback
    res.json({
      success: true,
      policies: [],
      count: 0,
      message: 'Policy listing unavailable'
    });
  }
});

export default router;
