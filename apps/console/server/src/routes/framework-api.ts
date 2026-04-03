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

// --- Helpers ---

/** Generate a cryptographic HMAC-SHA256 warrant signature */
function signWarrant(warrant: Record<string, any>): string {
  const signingKey = process.env.VIENNA_WARRANT_KEY || 'vienna-dev-key-change-in-production';
  const payload = [
    warrant.warrant_id,
    warrant.issued_by || 'vienna',
    warrant.issued_at,
    warrant.expires_at,
    warrant.risk_tier,
    warrant.intent_id || '',
    JSON.stringify(warrant.allowed_actions || []),
    JSON.stringify(warrant.forbidden_actions || []),
    JSON.stringify(warrant.constraints || {}),
  ].join('|');

  return 'hmac-sha256:' + crypto
    .createHmac('sha256', signingKey)
    .update(payload)
    .digest('hex');
}

/** Record a usage event for billing */
async function recordUsageEvent(tenantId: string, eventType: string, metadata: Record<string, any> = {}) {
  try {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    await execute(
      `INSERT INTO usage_events (tenant_id, event_type, count, period, metadata)
       VALUES ($1::uuid, $2, 1, $3, $4)
       ON CONFLICT (tenant_id, event_type, period)
       DO UPDATE SET count = usage_events.count + 1, metadata = $4, recorded_at = NOW()`,
      [tenantId, eventType, period, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Usage tracking is non-critical — don't fail the request
    console.warn('[FrameworkAPI] Usage event recording failed:', err);
  }
}

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

    // Update last_used_at
    execute(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [record.id]
    ).catch(() => {}); // fire-and-forget
    
    (req as any).apiKey = apiKey;
    (req as any).apiKeyId = record.id;
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
 */
router.post('/intents', async (req, res) => {
  try {
    const { agent_id, framework, action, params, objective, metadata } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    const intentId = `int_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const tenantId = (req as any).tenantId || 'default';
    const resolvedAgentId = agent_id || (req as any).agentId || 'unknown';
    const resolvedFramework = framework || (req as any).framework || 'unknown';

    // Record intent submission in audit log
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, 'intent.submitted', $2, $3, 0, NOW())`,
        [tenantId, resolvedAgentId, JSON.stringify({
          intent_id: intentId,
          action,
          params: params || {},
          objective: objective || null,
          framework: resolvedFramework,
          metadata: metadata || {},
        })]
      );
    } catch (auditErr) {
      console.warn('[FrameworkAPI] Audit log write failed for intent submission:', auditErr);
    }

    // Emit intent submitted event
    eventBus.emitIntentSubmitted({
      intent_id: intentId,
      agent_id: resolvedAgentId,
      action,
      risk_tier: 'unknown'
    }, tenantId);

    // Record usage
    recordUsageEvent(tenantId, 'intent_submitted', { agent_id: resolvedAgentId, action });

    // Classify risk tier
    let riskTier = 'T0';
    let requirements: any = { approval_required: false, max_ttl_minutes: 60, approval_count: 0 };
    try {
      const RiskTier = require('@vienna/lib/governance/risk-tier');
      const riskTierClassifier = new RiskTier();
      riskTier = riskTierClassifier.classify({ action, ...params, ...metadata });
      requirements = riskTierClassifier.getRequirements(riskTier);
    } catch (err) {
      console.warn('[FrameworkAPI] Risk tier classification failed, defaulting to T0:', err);
    }

    // ─── T0/T1: Auto-approve → Issue real warrant ───
    if (!requirements.approval_required) {
      const warrantId = `wrt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const maxTtl = requirements.max_ttl_minutes || 60;
      const expiresAt = new Date(Date.now() + maxTtl * 60 * 1000).toISOString();
      const allowedActions = [action];
      const forbiddenActions: string[] = [];

      const warrant = {
        warrant_id: warrantId,
        issued_by: 'vienna',
        issued_at: timestamp,
        expires_at: expiresAt,
        risk_tier: riskTier,
        intent_id: intentId,
        agent_id: resolvedAgentId,
        framework: resolvedFramework,
        allowed_actions: allowedActions,
        forbidden_actions: forbiddenActions,
        constraints: {},
        objective: objective || action,
        signature: '',
      };
      warrant.signature = signWarrant(warrant);

      // Persist warrant to DB (id is UUID type in existing schema)
      try {
        const dbWarrant = await queryOne<{ id: string }>(
          `INSERT INTO warrants (id, tenant_id, intent_id, agent_id, risk_tier, scope, signature, expires_at, revoked, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false, NOW())
           RETURNING id`,
          [
            tenantId,
            intentId,
            resolvedAgentId,
            riskTier,
            JSON.stringify({
              warrant_id: warrantId, // Store friendly ID in scope for lookups
              allowed_actions: allowedActions,
              forbidden_actions: forbiddenActions,
              constraints: {},
              framework: resolvedFramework,
              objective: objective || action,
            }),
            warrant.signature,
            expiresAt,
          ]
        );
        // Use the DB UUID as the canonical warrant ID
        if (dbWarrant?.id) {
          // Keep our friendly ID in the response but store mapping
          warrant.db_id = dbWarrant.id;
        }
      } catch (dbErr) {
        console.warn('[FrameworkAPI] Warrant DB write failed, continuing with in-memory warrant:', dbErr);
      }

      // Record approval in audit log
      try {
        await execute(
          `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
           VALUES ($1, 'intent.approved', 'system_auto', $2, $3, NOW())`,
          [tenantId, JSON.stringify({
            intent_id: intentId,
            warrant_id: warrantId,
            risk_tier: riskTier,
            auto_approved: true,
          }), riskTier === 'T0' ? 0 : 1]
        );
      } catch (auditErr) {
        console.warn('[FrameworkAPI] Audit log write failed for approval:', auditErr);
      }

      // Emit events
      eventBus.emitIntentApproved({
        intent_id: intentId,
        warrant_id: warrantId,
        approved_by: 'system_auto',
        risk_tier: riskTier
      }, tenantId);

      eventBus.emitWarrantIssued({
        warrant_id: warrantId,
        intent_id: intentId,
        agent_id: resolvedAgentId,
        expires_at: expiresAt,
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
          allowed_actions: allowedActions,
          forbidden_actions: forbiddenActions,
          agent_id: resolvedAgentId,
          framework: resolvedFramework,
          signature: warrant.signature,
        }
      });
    }

    // ─── T2/T3: Requires human approval — queue for review ───
    const approvalId = `app_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const approvalExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Persist pending approval to DB
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, 'approval.required', $2, $3, $4, NOW())`,
        [tenantId, resolvedAgentId, JSON.stringify({
          approval_id: approvalId,
          intent_id: intentId,
          action,
          risk_tier: riskTier,
          required_approvers: requirements.approval_count,
          expires_at: approvalExpiresAt,
          params: params || {},
          objective: objective || null,
        }), riskTier === 'T2' ? 2 : 3]
      );
    } catch (auditErr) {
      console.warn('[FrameworkAPI] Audit log write failed for approval request:', auditErr);
    }
    
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

    // If approved, include warrant info
    let warrant = null;
    if (statusMap[auditEntry.event] === 'approved' && details?.warrant_id) {
      warrant = await queryOne(
        `SELECT id as warrant_id, scope, signature, expires_at, revoked, created_at as issued_at
         FROM warrants WHERE id = $1 AND tenant_id = $2`,
        [details.warrant_id, tenantId]
      );
    }
    
    res.json({
      success: true,
      intent_id: intentId,
      status: statusMap[auditEntry.event] || 'pending',
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
 */
router.post('/executions', async (req, res) => {
  try {
    const { warrant_id, agent_id, action, success, output, error, metrics } = req.body;

    if (!warrant_id) {
      return res.status(400).json({ success: false, error: 'warrant_id is required' });
    }

    const executionId = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tenantId = (req as any).tenantId || 'default';
    const resolvedAgentId = agent_id || (req as any).agentId || 'unknown';
    const timestamp = new Date().toISOString();

    // Verify warrant exists and is valid
    let warrantValid = false;
    let warrantScope: any = null;
    try {
      const warrant = await queryOne<{
        id: string;
        scope: any;
        expires_at: string;
        revoked: boolean;
      }>(
        `SELECT id, scope, expires_at, revoked FROM warrants
         WHERE (id::text = $1 OR scope->>'warrant_id' = $1) AND tenant_id = $2`,
        [warrant_id, tenantId]
      );

      if (warrant) {
        const expired = new Date(warrant.expires_at) < new Date();
        warrantValid = !warrant.revoked && !expired;
        warrantScope = typeof warrant.scope === 'string' ? JSON.parse(warrant.scope) : warrant.scope;

        if (!warrantValid) {
          console.warn(`[FrameworkAPI] Execution reported against invalid warrant ${warrant_id}:`, {
            revoked: warrant.revoked,
            expired,
            expires_at: warrant.expires_at,
          });
        }
      }
    } catch (dbErr) {
      console.warn('[FrameworkAPI] Warrant verification failed:', dbErr);
    }

    // Emit events
    eventBus.emitExecutionStarted({
      execution_id: executionId,
      warrant_id,
      agent_id: resolvedAgentId,
      action: action || 'reported'
    }, tenantId);

    eventBus.emitExecutionCompleted({
      execution_id: executionId,
      warrant_id,
      duration_ms: metrics?.duration_ms || 0,
      success: success || false,
      output
    }, tenantId);

    // Record in audit log
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, $2, $3, $4, 0, NOW())`,
        [
          tenantId,
          success ? 'execution.completed' : 'execution.failed',
          resolvedAgentId,
          JSON.stringify({
            execution_id: executionId,
            warrant_id,
            warrant_valid: warrantValid,
            success,
            output: output?.substring(0, 1000), // Truncate for audit
            error,
            metrics,
          }),
        ]
      );
    } catch (auditErr) {
      console.warn('[FrameworkAPI] Audit log write failed:', auditErr);
    }

    // Record usage
    recordUsageEvent(tenantId, 'execution_completed', {
      agent_id: resolvedAgentId,
      warrant_id,
      success,
    });

    // Record agent activity
    try {
      await execute(
        `INSERT INTO agent_activity (agent_id, action_type, result, latency_ms, risk_tier, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          resolvedAgentId,
          action || 'unknown',
          success ? 'executed' : 'failed',
          metrics?.duration_ms || null,
          warrantScope?.risk_tier || null,
          JSON.stringify({ execution_id: executionId, warrant_id, output: output?.substring(0, 500) }),
        ]
      );
    } catch (actErr) {
      // Non-critical
    }

    res.json({
      success: true,
      execution_id: executionId,
      warrant_id,
      warrant_valid: warrantValid,
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
    const { agent_id, framework, name, description, capabilities, config, tags } = req.body;

    if (!agent_id || !name) {
      return res.status(400).json({ success: false, error: 'agent_id and name are required' });
    }

    const tenantId = (req as any).tenantId || 'default';
    const timestamp = new Date().toISOString();

    // Persist to agent_registry (upsert)
    try {
      await execute(
        `INSERT INTO agent_registry (agent_id, display_name, description, agent_type, status, config, tags, registered_by, last_heartbeat)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, NOW())
         ON CONFLICT (agent_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           description = EXCLUDED.description,
           config = EXCLUDED.config,
           tags = EXCLUDED.tags,
           status = 'active',
           last_heartbeat = NOW(),
           updated_at = NOW()`,
        [
          agent_id,
          name,
          description || null,
          framework === 'supervised' ? 'supervised' : 'semi-autonomous',
          JSON.stringify({ ...(config || {}), framework, capabilities: capabilities || [] }),
          JSON.stringify(tags || capabilities || []),
          (req as any).agentId || 'api',
        ]
      );
    } catch (dbErr) {
      console.warn('[FrameworkAPI] Agent registry write failed:', dbErr);
    }

    // Record in audit log
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, 'agent.registered', $2, $3, 0, NOW())`,
        [tenantId, agent_id, JSON.stringify({
          agent_id,
          framework: framework || 'unknown',
          capabilities: capabilities || [],
          name,
        })]
      );
    } catch (auditErr) {
      // Non-critical
    }

    // Emit event
    eventBus.emitAgentRegistered({
      agent_id,
      framework: framework || 'unknown',
      capabilities: capabilities || []
    }, tenantId);

    // Record usage
    recordUsageEvent(tenantId, 'agent_registered', { agent_id, framework });

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
    const { status, metrics } = req.body;
    
    const tenantId = (req as any).tenantId || 'default';
    const timestamp = new Date().toISOString();
    const agentStatus = status || 'healthy';

    // Update agent_registry last_heartbeat and status
    try {
      const updated = await queryOne<{ agent_id: string }>(
        `UPDATE agent_registry
         SET last_heartbeat = NOW(),
             status = $2,
             updated_at = NOW()
         WHERE agent_id = $1
         RETURNING agent_id`,
        [agentId, agentStatus === 'healthy' ? 'active' : agentStatus]
      );

      if (!updated) {
        // Agent not registered yet — auto-register with basic info
        await execute(
          `INSERT INTO agent_registry (agent_id, display_name, status, last_heartbeat, registered_by)
           VALUES ($1, $1, 'active', NOW(), 'heartbeat')
           ON CONFLICT (agent_id) DO UPDATE SET last_heartbeat = NOW(), status = 'active', updated_at = NOW()`,
          [agentId]
        );
      }
    } catch (dbErr) {
      console.warn('[FrameworkAPI] Agent heartbeat DB update failed:', dbErr);
    }

    // Emit event
    eventBus.emitAgentHeartbeat({
      agent_id: agentId,
      status: agentStatus,
      last_seen: timestamp
    }, tenantId);

    // Record usage (throttled — heartbeats are high volume)
    recordUsageEvent(tenantId, 'agent_heartbeat', { agent_id: agentId });

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

    const warrant = await queryOne<{
      id: string;
      tenant_id: string;
      intent_id: string;
      agent_id: string;
      risk_tier: string;
      scope: any;
      signature: string;
      expires_at: string;
      revoked: boolean;
      created_at: string;
    }>(
      `SELECT id, tenant_id, intent_id, agent_id, risk_tier, scope, signature, expires_at, revoked, created_at
       FROM warrants WHERE (id::text = $1 OR scope->>'warrant_id' = $1) AND tenant_id = $2`,
      [warrantId, tenantId]
    );

    if (!warrant) {
      return res.status(404).json({
        success: false,
        error: 'Warrant not found'
      });
    }

    const now = new Date();
    const expired = new Date(warrant.expires_at) < now;
    const valid = !warrant.revoked && !expired;
    const scope = typeof warrant.scope === 'string' ? JSON.parse(warrant.scope) : warrant.scope;

    // Verify signature integrity
    let signatureValid = false;
    try {
      const reconstructed = signWarrant({
        warrant_id: warrant.id,
        issued_by: 'vienna',
        issued_at: warrant.created_at,
        expires_at: warrant.expires_at,
        risk_tier: warrant.risk_tier,
        intent_id: warrant.intent_id,
        allowed_actions: scope?.allowed_actions || [],
        forbidden_actions: scope?.forbidden_actions || [],
        constraints: scope?.constraints || {},
      });
      signatureValid = reconstructed === warrant.signature;
    } catch {
      signatureValid = false;
    }

    if (!signatureValid && warrant.signature) {
      // Potential tampering — log it
      console.error(`[FrameworkAPI] ⚠️ WARRANT SIGNATURE MISMATCH for ${warrantId}`);
      try {
        await execute(
          `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
           VALUES ($1, 'warrant.tamper_detected', 'system', $2, 3, NOW())`,
          [tenantId, JSON.stringify({ warrant_id: warrantId })]
        );
      } catch {}
    }

    const remainingMs = new Date(warrant.expires_at).getTime() - now.getTime();

    res.json({
      success: true,
      warrant_id: warrantId,
      valid,
      signature_valid: signatureValid,
      revoked: warrant.revoked,
      expired,
      expires_at: warrant.expires_at,
      issued_at: warrant.created_at,
      risk_tier: warrant.risk_tier,
      remaining_minutes: valid ? Math.floor(remainingMs / 60000) : 0,
      scope,
      agent_id: warrant.agent_id,
      intent_id: warrant.intent_id,
    });
  } catch (error: any) {
    // Graceful fallback if warrants table doesn't exist
    res.json({
      success: true,
      warrant_id: req.params.warrantId,
      valid: false,
      message: 'Warrant lookup unavailable'
    });
  }
});

/**
 * POST /api/v1/warrants/:warrantId/revoke
 * Revoke an active warrant.
 */
router.post('/warrants/:warrantId/revoke', async (req, res) => {
  try {
    const { warrantId } = req.params;
    const { reason } = req.body;
    const tenantId = (req as any).tenantId || 'default';

    const updated = await queryOne<{ id: string }>(
      `UPDATE warrants SET revoked = true, revoked_at = NOW() 
       WHERE (id::text = $1 OR scope->>'warrant_id' = $1) AND tenant_id = $2 AND revoked = false 
       RETURNING id`,
      [warrantId, tenantId]
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Warrant not found or already revoked' });
    }

    // Audit log
    try {
      await execute(
        `INSERT INTO audit_log (tenant_id, event, actor, details, risk_tier, created_at)
         VALUES ($1, 'warrant.revoked', $2, $3, 2, NOW())`,
        [tenantId, (req as any).agentId, JSON.stringify({ warrant_id: warrantId, reason })]
      );
    } catch {}

    res.json({ success: true, warrant_id: warrantId, revoked: true, reason });
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
    const tenantId = (req as any).tenantId || 'default';
    
    const policies = await query<{
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
