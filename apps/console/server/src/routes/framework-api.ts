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
import { query, queryOne, execute } from '../db/postgres.js';

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
    
    const details = typeof auditEntry.details === 'string'
      ? JSON.parse(auditEntry.details)
      : auditEntry.details;
    const status = statusMap[auditEntry.event] || 'pending';

    // If approved, include the warrant so the agent can use it
    let warrant = null;
    if (status === 'approved' && details?.warrant_id) {
      try {
        const viennaCore = (req as any).app?.locals?.viennaCore;
        if (viennaCore?.warrant) {
          const verification = await viennaCore.warrant.verify(details.warrant_id);
          if (verification.valid) {
            warrant = {
              warrant_id: details.warrant_id,
              valid: true,
              expires_at: verification.warrant?.expires_at,
              risk_tier: verification.risk_tier,
              remaining_minutes: verification.remaining_minutes,
              allowed_actions: verification.warrant?.allowed_actions,
            };
          } else {
            warrant = {
              warrant_id: details.warrant_id,
              valid: false,
              reason: verification.reason,
            };
          }
        }
      } catch {}
    }

    res.json({
      success: true,
      intent_id: intentId,
      status,
      details,
      warrant: warrant || undefined,
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

    // Persist to execution_log for analytics and dashboard
    try {
      await execute(
        `INSERT INTO execution_log (execution_id, tenant_id, warrant_id, execution_mode, state, risk_tier, objective, result, created_at, completed_at)
         VALUES ($1, $2, $3, 'framework_api', $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (execution_id) DO UPDATE SET
           state = EXCLUDED.state,
           result = EXCLUDED.result,
           completed_at = NOW()`,
        [
          executionId,
          tenantId,
          warrant_id || null,
          success ? 'completed' : 'failed',
          'T0', // Default; will be overridden by warrant scope if available
          `Execution via Framework API: ${success ? 'success' : 'failed'}`,
          JSON.stringify({
            success,
            output: output?.substring(0, 2000),
            error,
            metrics,
            estimated_cost: metrics?.estimated_cost || null,
          }),
        ]
      );
    } catch (execLogErr) {
      // Non-critical — analytics may be incomplete
      console.warn('[Framework API] execution_log write failed:', execLogErr);
    }

    // Verify warrant before acknowledging execution
    let warrantValid = false;
    try {
      const viennaCore = (req as any).app?.locals?.viennaCore;
      if (viennaCore?.warrant) {
        const verification = await viennaCore.warrant.verify(warrant_id);
        warrantValid = verification.valid === true;
        if (!warrantValid) {
          console.warn(`[framework-api] Execution reported against invalid warrant ${warrant_id}: ${verification.reason}`);
        }
      }
    } catch (verifyErr) {
      console.warn('[framework-api] Warrant verification failed during execution report:', verifyErr);
    }

    // Record agent activity
    try {
      await execute(
        `INSERT INTO agent_activity (agent_id, action_type, result, latency_ms, risk_tier, context, created_at)
         VALUES ($1, 'execution', $2, $3, null, $4, NOW())`,
        [
          agent_id || 'unknown',
          success ? 'executed' : 'failed',
          metrics?.duration_ms || null,
          JSON.stringify({ execution_id: executionId, warrant_id, warrant_valid: warrantValid }),
        ]
      );
    } catch {}

    res.json({
      success: true,
      execution_id: executionId,
      warrant_id,
      recorded: true,
      verified: warrantValid,
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

    // Persist to agent_registry (upsert)
    try {
      await execute(
        `INSERT INTO agent_registry (agent_id, display_name, description, agent_type, status, config, tags, registered_by, last_heartbeat)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, NOW())
         ON CONFLICT (agent_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = COALESCE(EXCLUDED.description, agent_registry.description),
           config = EXCLUDED.config,
           tags = EXCLUDED.tags,
           status = 'active',
           last_heartbeat = NOW(),
           updated_at = NOW()`,
        [
          agent_id,
          name,
          config?.description || null,
          framework === 'supervised' ? 'supervised' : 'semi-autonomous',
          JSON.stringify({ ...(config || {}), framework, capabilities: capabilities || [] }),
          JSON.stringify(capabilities || []),
          (req as any).agentId || 'api',
        ]
      );
    } catch (dbErr) {
      console.warn('[framework-api] Agent registry write failed (non-critical):', dbErr);
    }

    // Record in audit log
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, 'agent.registered', $2, $3, 0, NOW())`,
        [tenantId, agent_id, JSON.stringify({ agent_id, framework, capabilities: capabilities || [], name })]
      );
    } catch {}

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

    // Persist heartbeat to agent_registry
    try {
      const updated = await queryOne<{ agent_id: string }>(
        `UPDATE agent_registry
         SET last_heartbeat = NOW(),
             status = CASE WHEN $2 = 'healthy' THEN 'active' ELSE $2 END,
             updated_at = NOW()
         WHERE agent_id = $1
         RETURNING agent_id`,
        [agentId, status || 'healthy']
      );

      if (!updated) {
        // Auto-register agent on first heartbeat
        await execute(
          `INSERT INTO agent_registry (agent_id, display_name, status, last_heartbeat, registered_by)
           VALUES ($1, $1, 'active', NOW(), 'heartbeat')
           ON CONFLICT (agent_id) DO UPDATE SET last_heartbeat = NOW(), status = 'active', updated_at = NOW()`,
          [agentId]
        );
      }
    } catch (dbErr) {
      console.warn('[framework-api] Agent heartbeat DB update failed (non-critical):', dbErr);
    }

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

// --- Approvals ---

/**
 * POST /api/v1/approvals/:approvalId/approve
 * Approve a pending T2/T3 intent → issues a warrant.
 */
router.post('/approvals/:approvalId/approve', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { reason } = req.body;
    const tenantId = (req as any).tenantId || 'default';
    const operatorId = (req as any).agentId || 'operator';

    // Find the pending approval in audit_log
    const approval = await queryOne<{ details: any }>(
      `SELECT details FROM audit_log
       WHERE event = 'approval.required' AND details->>'approval_id' = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [approvalId, tenantId]
    );

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval not found' });
    }

    const details = typeof approval.details === 'string' ? JSON.parse(approval.details) : approval.details;
    const intentId = details.intent_id;
    const action = details.action;
    const riskTier = details.risk_tier;

    // Check if already resolved
    const alreadyResolved = await queryOne(
      `SELECT id FROM audit_log
       WHERE (event = 'intent.approved' OR event = 'intent.denied') 
         AND details->>'intent_id' = $1 AND tenant_id = $2`,
      [intentId, tenantId]
    );

    if (alreadyResolved) {
      return res.status(409).json({ success: false, error: 'Intent already resolved' });
    }

    // Issue warrant via Warrant Authority
    const viennaCore = (req as any).app?.locals?.viennaCore;
    let warrant: any = null;

    if (viennaCore?.warrant) {
      try {
        warrant = await viennaCore.warrant.issue({
          truthSnapshotId: `truth_${intentId}`,
          planId: intentId,
          approvalId: approvalId,
          objective: `${action} (approved by ${operatorId})`,
          riskTier: riskTier,
          allowedActions: [action],
          forbiddenActions: [],
          constraints: details.params || {},
          expiresInMinutes: riskTier === 'T2' ? 15 : 5,
          justification: riskTier === 'T3' ? (reason || 'Approved via API') : undefined,
          rollbackPlan: riskTier === 'T3' ? 'Manual rollback required' : undefined,
          issuer: operatorId,
        });
      } catch (warrantErr: any) {
        console.error('[framework-api] Warrant issuance failed on approval:', warrantErr);
        return res.status(500).json({ success: false, error: `Warrant issuance failed: ${warrantErr.message}` });
      }
    }

    // Record approval in audit log
    await execute(
      `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
       VALUES ($1, 'intent.approved', $2, $3, $4, NOW())`,
      [tenantId, operatorId, JSON.stringify({
        intent_id: intentId,
        approval_id: approvalId,
        warrant_id: warrant?.warrant_id || null,
        risk_tier: riskTier,
        reason,
        approved_by: operatorId,
      }), riskTier === 'T2' ? 2 : 3]
    );

    eventBus.emitIntentApproved({
      intent_id: intentId,
      warrant_id: warrant?.warrant_id || 'pending',
      approved_by: operatorId,
      risk_tier: riskTier,
    }, tenantId);

    res.json({
      success: true,
      approval_id: approvalId,
      intent_id: intentId,
      status: 'approved',
      warrant_id: warrant?.warrant_id || null,
      warrant: warrant ? {
        warrant_id: warrant.warrant_id,
        issued_at: warrant.issued_at,
        expires_at: warrant.expires_at,
        risk_tier: warrant.risk_tier,
        allowed_actions: warrant.allowed_actions,
        signature: warrant.signature,
      } : null,
    });
  } catch (error: any) {
    console.error('[framework-api] Approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/approvals/:approvalId/deny
 * Deny a pending T2/T3 intent.
 */
router.post('/approvals/:approvalId/deny', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { reason } = req.body;
    const tenantId = (req as any).tenantId || 'default';
    const operatorId = (req as any).agentId || 'operator';

    if (!reason) {
      return res.status(400).json({ success: false, error: 'reason is required for denials' });
    }

    const approval = await queryOne<{ details: any }>(
      `SELECT details FROM audit_log
       WHERE event = 'approval.required' AND details->>'approval_id' = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [approvalId, tenantId]
    );

    if (!approval) {
      return res.status(404).json({ success: false, error: 'Approval not found' });
    }

    const details = typeof approval.details === 'string' ? JSON.parse(approval.details) : approval.details;

    // Record denial
    await execute(
      `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
       VALUES ($1, 'intent.denied', $2, $3, $4, NOW())`,
      [tenantId, operatorId, JSON.stringify({
        intent_id: details.intent_id,
        approval_id: approvalId,
        reason,
        denied_by: operatorId,
      }), details.risk_tier === 'T2' ? 2 : 3]
    );

    eventBus.emitIntentDenied({
      intent_id: details.intent_id,
      denied_by: operatorId,
      reason,
      risk_tier: details.risk_tier,
    }, tenantId);

    res.json({
      success: true,
      approval_id: approvalId,
      intent_id: details.intent_id,
      status: 'denied',
      reason,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/approvals/pending
 * List pending approvals for this tenant.
 */
router.get('/approvals/pending', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId || 'default';

    const pending = await query<{ details: any; created_at: string }>(
      `SELECT details, created_at FROM audit_log
       WHERE event = 'approval.required' AND tenant_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM audit_log a2
           WHERE (a2.event = 'intent.approved' OR a2.event = 'intent.denied')
             AND a2.details->>'intent_id' = audit_log.details->>'intent_id'
             AND a2.tenant_id = $1
         )
       ORDER BY created_at DESC
       LIMIT 50`,
      [tenantId]
    );

    const approvals = (pending || []).map(row => {
      const d = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
      // Check if expired
      const expired = d.expires_at && new Date(d.expires_at) < new Date();
      return {
        approval_id: d.approval_id,
        intent_id: d.intent_id,
        action: d.action,
        risk_tier: d.risk_tier,
        required_approvers: d.required_approvers,
        expires_at: d.expires_at,
        expired,
        created_at: row.created_at,
      };
    }).filter(a => !a.expired); // Filter out expired

    res.json({
      success: true,
      approvals,
      count: approvals.length,
    });
  } catch (error: any) {
    res.json({ success: true, approvals: [], count: 0 });
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
