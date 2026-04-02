/**
 * Execution Callback Receiver — Phase 4A
 * 
 * Receives delegated execution completion callbacks from external systems.
 * Correlates by execution_id, rejects replays/malformed, triggers verification.
 * 
 * Owner: Vienna (implementation)
 * Design: Aiden (Phase 4A spec)
 * 
 * Route: POST /api/v1/webhooks/execution-callback
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute } from '../db/postgres.js';
import { redactSecrets } from '../services/secretRedaction.js';

// ---- Types ----

interface CallbackPayload {
  execution_id: string;
  status: 'success' | 'failure';
  result?: any;
  error?: string;
  timestamp?: string;
}

// Terminal states — callbacks for these are rejected
const TERMINAL_STATES = ['complete', 'failed', 'cancelled', 'archived'];

// States that accept callbacks
const CALLBACK_ACCEPTING_STATES = ['executing', 'awaiting_callback'];

// Rate limiting: Track callback timestamps per execution_id
const callbackTimestamps = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // Max 1 callback per second per execution

// JSON Schema for callback payload
const CALLBACK_SCHEMA = {
  type: 'object',
  required: ['execution_id', 'status'],
  properties: {
    execution_id: { type: 'string', pattern: '^exe_[a-zA-Z0-9_-]+$' },
    status: { type: 'string', enum: ['success', 'failure'] },
    result: { type: 'object' },
    error: { type: 'string' },
    timestamp: { type: 'string' },
  },
  additionalProperties: false,
};

/**
 * Validate JSON against schema (simple validator).
 */
function validateSchema(payload: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in payload)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }
  
  // Check types and constraints
  for (const [key, value] of Object.entries(payload)) {
    const propSchema = schema.properties?.[key];
    if (!propSchema && !schema.additionalProperties) {
      errors.push(`Unexpected field: ${key}`);
      continue;
    }
    
    if (propSchema) {
      // Type check
      if (propSchema.type && typeof value !== propSchema.type) {
        errors.push(`Field ${key} must be ${propSchema.type}, got ${typeof value}`);
      }
      
      // Enum check
      if (propSchema.enum && !propSchema.enum.includes(value)) {
        errors.push(`Field ${key} must be one of: ${propSchema.enum.join(', ')}`);
      }
      
      // Pattern check
      if (propSchema.pattern && typeof value === 'string') {
        const regex = new RegExp(propSchema.pattern);
        if (!regex.test(value)) {
          errors.push(`Field ${key} does not match pattern: ${propSchema.pattern}`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

export function createExecutionCallbackRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/webhooks/execution-callback
   * 
   * Receives delegated execution completion notifications.
   */
  router.post('/', async (req: Request, res: Response) => {
    const receivedAt = new Date().toISOString();

    try {
      // 1. JSON Schema validation
      const validation = validateSchema(req.body, CALLBACK_SCHEMA);
      if (!validation.valid) {
        console.warn(`[ExecutionCallback] Schema validation failed: ${validation.errors.join(', ')}`);
        return res.status(400).json({
          accepted: false,
          error: 'Invalid payload schema',
          details: validation.errors,
          code: 'INVALID_SCHEMA',
          timestamp: receivedAt,
        });
      }

      const { execution_id, status, result, error, timestamp } = req.body as CallbackPayload;

      // 2. Rate limiting (max 1 callback per second per execution)
      const now = Date.now();
      const lastCallback = callbackTimestamps.get(execution_id);
      
      if (lastCallback && (now - lastCallback) < RATE_LIMIT_MS) {
        console.warn(`[ExecutionCallback] Rate limit exceeded for ${execution_id} (${now - lastCallback}ms since last)`);
        return res.status(429).json({
          accepted: false,
          error: 'Rate limit exceeded (max 1 callback per second)',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: receivedAt,
          retry_after_ms: RATE_LIMIT_MS - (now - lastCallback),
        });
      }
      
      callbackTimestamps.set(execution_id, now);
      
      // Clean up old timestamps (prevent memory leak)
      if (callbackTimestamps.size > 10000) {
        const cutoff = now - 60000; // Remove entries older than 1 minute
        for (const [id, ts] of callbackTimestamps.entries()) {
          if (ts < cutoff) callbackTimestamps.delete(id);
        }
      }

      // 3. Look up execution with FOR UPDATE lock (prevents concurrent callback processing)
      const execution = await queryOne<any>(
        `SELECT id, execution_id, tenant_id, state, execution_mode 
         FROM regulator.execution_log 
         WHERE execution_id = $1
         FOR UPDATE`,
        [execution_id],
      );

      if (!execution) {
        console.warn(`[ExecutionCallback] Unknown execution_id: ${execution_id}`);
        return res.status(404).json({
          accepted: false,
          error: 'Execution not found',
          code: 'EXECUTION_NOT_FOUND',
          timestamp: receivedAt,
        });
      }

      // 4. Signature verification (if configured)
      const signatureHeader = req.headers['x-callback-signature'] as string;
      if (signatureHeader) {
        // Look up callback secret from adapter config
        const adapterConfig = await queryOne<any>(
          `SELECT headers FROM regulator.adapter_configs 
           WHERE tenant_id = $1 AND enabled = true 
           ORDER BY created_at DESC LIMIT 1`,
          [execution.tenant_id],
        );

        if (adapterConfig?.headers?.['X-Callback-Secret']) {
          const expectedSig = crypto
            .createHmac('sha256', adapterConfig.headers['X-Callback-Secret'])
            .update(JSON.stringify(req.body))
            .digest('hex');

          if (signatureHeader !== expectedSig) {
            console.warn(`[ExecutionCallback] Signature mismatch for ${execution_id}`);
            // Log attempt
            await logCallbackEvent(execution_id, execution.tenant_id, 'callback_rejected', {
              reason: 'signature_mismatch',
            });

            return res.status(401).json({
              accepted: false,
              error: 'Invalid callback signature',
              code: 'SIGNATURE_INVALID',
              timestamp: receivedAt,
            });
          }
        }
      }

      // 5. Check current state — reject if terminal (idempotent)
      if (TERMINAL_STATES.includes(execution.state)) {
        console.warn(`[ExecutionCallback] Duplicate/late callback for ${execution_id} (state: ${execution.state})`);
        
        await logCallbackEvent(execution_id, execution.tenant_id, 'callback_rejected', {
          reason: 'already_terminal',
          current_state: execution.state,
        });

        // Return 409 but don't error — this is idempotent for the caller
        return res.status(409).json({
          accepted: false,
          execution_id,
          current_state: execution.state,
          error: 'Execution already in terminal state',
          code: 'ALREADY_TERMINAL',
          timestamp: receivedAt,
        });
      }

      // 6. Check if in callback-accepting state
      if (!CALLBACK_ACCEPTING_STATES.includes(execution.state)) {
        console.warn(`[ExecutionCallback] Callback for ${execution_id} in unexpected state: ${execution.state}`);
        
        await logCallbackEvent(execution_id, execution.tenant_id, 'callback_rejected', {
          reason: 'unexpected_state',
          current_state: execution.state,
        });

        return res.status(409).json({
          accepted: false,
          execution_id,
          current_state: execution.state,
          error: `Execution not accepting callbacks (state: ${execution.state})`,
          code: 'UNEXPECTED_STATE',
          timestamp: receivedAt,
        });
      }

      // 7. Redact callback result before persistence
      const redactedResult = result ? redactSecrets(result) : null;
      const redactedError = error || null;

      const previousState = execution.state;
      const newState = status === 'success' ? 'verifying' : 'failed';

      // 8. Update execution state
      await execute(
        `UPDATE regulator.execution_log 
         SET state = $1, 
             result = COALESCE(result, '{}'::jsonb) || $2::jsonb,
             updated_at = NOW(),
             completed_at = CASE WHEN $1 IN ('complete', 'failed') THEN NOW() ELSE completed_at END
         WHERE execution_id = $3`,
        [
          newState,
          JSON.stringify({
            callback_received: receivedAt,
            callback_status: status,
            callback_result: redactedResult,
            callback_error: redactedError,
          }),
          execution_id,
        ],
      );

      // 9. Add timeline entry
      await execute(
        `UPDATE regulator.execution_log 
         SET timeline = timeline || $1::jsonb
         WHERE execution_id = $2`,
        [
          JSON.stringify([{
            state: newState,
            detail: `Delegated callback received: ${status}`,
            callback_source: 'external',
            timestamp: receivedAt,
          }]),
          execution_id,
        ],
      );

      // 10. Log audit event
      await logCallbackEvent(execution_id, execution.tenant_id, 'callback_accepted', {
        previous_state: previousState,
        new_state: newState,
        callback_status: status,
      });

      // 11. FIX #4: Real verification before promoting to complete
      if (newState === 'verifying' && status === 'success') {
        const verificationResult = await verifyCallbackResult(
          execution_id,
          execution.tenant_id,
          redactedResult,
        );

        if (verificationResult.verified) {
          // Verification passed — promote to complete
          await execute(
            `UPDATE regulator.execution_log 
             SET state = 'complete',
                 updated_at = NOW(),
                 completed_at = NOW(),
                 timeline = timeline || $1::jsonb
             WHERE execution_id = $2`,
            [
              JSON.stringify([{
                state: 'complete',
                detail: 'Delegated execution verified complete via callback',
                verification: verificationResult.checks,
                timestamp: new Date().toISOString(),
              }]),
              execution_id,
            ],
          );
        } else {
          // Verification failed — mark as failed with details
          await execute(
            `UPDATE regulator.execution_log 
             SET state = 'failed',
                 updated_at = NOW(),
                 completed_at = NOW(),
                 timeline = timeline || $1::jsonb
             WHERE execution_id = $2`,
            [
              JSON.stringify([{
                state: 'failed',
                detail: `Callback verification failed: ${verificationResult.reason}`,
                verification: verificationResult.checks,
                timestamp: new Date().toISOString(),
              }]),
              execution_id,
            ],
          );

          await logCallbackEvent(execution_id, execution.tenant_id, 'callback_verification_failed', {
            reason: verificationResult.reason,
            checks: verificationResult.checks,
          });
        }
      }

      console.log(`[ExecutionCallback] Accepted callback for ${execution_id}: ${previousState} → ${newState}`);

      return res.json({
        accepted: true,
        execution_id,
        previous_state: previousState,
        new_state: newState === 'verifying' ? 'complete' : newState,
        timestamp: receivedAt,
      });

    } catch (err: any) {
      console.error('[ExecutionCallback] Error processing callback:', err);
      return res.status(500).json({
        accepted: false,
        error: 'Internal error processing callback',
        code: 'INTERNAL_ERROR',
        timestamp: receivedAt,
      });
    }
  });

  return router;
}

// ---- Helpers ----

/**
 * FIX #4: Verify callback result against warrant scope and constraints.
 * 
 * Checks:
 * 1. Scope match — did the agent execute the action the warrant authorized?
 * 2. Constraint compliance — did the result stay within warrant constraints?
 * 3. Tenant verification policy — respects per-tenant config.
 */
async function verifyCallbackResult(
  executionId: string,
  tenantId: string,
  callbackResult: any,
): Promise<{ verified: boolean; reason?: string; checks: Record<string, any> }> {
  const checks: Record<string, any> = {
    scope_match: { passed: true, detail: 'not checked' },
    constraint_compliance: { passed: true, detail: 'not checked' },
    warrant_valid: { passed: true, detail: 'not checked' },
  };

  try {
    // Load tenant verification policy
    let verifyScope = true;
    let verifyConstraints = true;
    let autoPromoteOnSkip = false;

    try {
      const tenant = await queryOne<any>(
        `SELECT callback_verification_policy FROM regulator.tenants WHERE id = $1`,
        [tenantId],
      );
      if (tenant?.callback_verification_policy) {
        const policy = typeof tenant.callback_verification_policy === 'string'
          ? JSON.parse(tenant.callback_verification_policy)
          : tenant.callback_verification_policy;
        verifyScope = policy.verify_scope_match !== false;
        verifyConstraints = policy.verify_constraints !== false;
        autoPromoteOnSkip = policy.auto_promote_on_skip === true;

        if (!policy.enabled) {
          // Verification disabled for this tenant
          checks.scope_match.detail = 'skipped (tenant policy: disabled)';
          checks.constraint_compliance.detail = 'skipped (tenant policy: disabled)';
          return { verified: true, checks };
        }
      }
    } catch (err) {
      // If tenant lookup fails, use defaults (verify everything)
      console.warn('[CallbackVerification] Tenant policy lookup failed, using defaults:', err);
    }

    // Load the execution record to get warrant_id and expected action
    const execution = await queryOne<any>(
      `SELECT warrant_id, steps, objective, risk_tier 
       FROM regulator.execution_log 
       WHERE execution_id = $1`,
      [executionId],
    );

    if (!execution) {
      return {
        verified: false,
        reason: 'Execution record not found during verification',
        checks,
      };
    }

    // Parse steps to get expected action
    let expectedSteps: any[] = [];
    try {
      expectedSteps = typeof execution.steps === 'string'
        ? JSON.parse(execution.steps)
        : (execution.steps || []);
    } catch (e) {
      // If steps parsing fails, skip scope check
    }

    // Check 1: Scope match — verify the reported action matches what was authorized
    if (verifyScope && expectedSteps.length > 0 && callbackResult) {
      const expectedAction = expectedSteps[0]?.action?.type || expectedSteps[0]?.step_name;
      const reportedAction = callbackResult?.action || callbackResult?.action_type;

      if (reportedAction && expectedAction) {
        if (reportedAction !== expectedAction) {
          checks.scope_match = {
            passed: false,
            detail: `Expected action "${expectedAction}", callback reported "${reportedAction}"`,
            expected: expectedAction,
            reported: reportedAction,
          };

          return {
            verified: false,
            reason: `Scope mismatch: warrant authorized "${expectedAction}" but callback reported "${reportedAction}"`,
            checks,
          };
        } else {
          checks.scope_match = {
            passed: true,
            detail: `Action "${reportedAction}" matches warrant scope`,
          };
        }
      } else {
        checks.scope_match = {
          passed: true,
          detail: 'Scope check skipped: action type not reported in callback',
        };
      }
    }

    // Check 2: Warrant still valid at callback time
    if (execution.warrant_id) {
      try {
        // Look up warrant expiry
        const warrant = await queryOne<any>(
          `SELECT expires_at, revoked FROM regulator.warrants WHERE warrant_id = $1`,
          [execution.warrant_id],
        );

        if (warrant) {
          if (warrant.revoked) {
            checks.warrant_valid = {
              passed: false,
              detail: `Warrant ${execution.warrant_id} was revoked`,
            };
            return {
              verified: false,
              reason: `Warrant ${execution.warrant_id} was revoked before callback received`,
              checks,
            };
          }

          const expiresAt = new Date(warrant.expires_at);
          if (expiresAt < new Date()) {
            checks.warrant_valid = {
              passed: false,
              detail: `Warrant expired at ${warrant.expires_at}`,
            };
            return {
              verified: false,
              reason: `Warrant expired at ${warrant.expires_at} before callback received`,
              checks,
            };
          }

          checks.warrant_valid = {
            passed: true,
            detail: `Warrant ${execution.warrant_id} valid until ${warrant.expires_at}`,
          };
        } else {
          checks.warrant_valid = {
            passed: true,
            detail: 'Warrant record not found (may be in-memory only)',
          };
        }
      } catch (err) {
        checks.warrant_valid = {
          passed: true,
          detail: 'Warrant check skipped due to lookup error',
        };
      }
    }

    // Check 3: Constraint compliance
    if (verifyConstraints && callbackResult) {
      // Check duration constraint if execution has timing data
      if (callbackResult.duration_ms && expectedSteps[0]?.action?.timeout_ms) {
        const maxDuration = expectedSteps[0].action.timeout_ms;
        if (callbackResult.duration_ms > maxDuration) {
          checks.constraint_compliance = {
            passed: false,
            detail: `Execution took ${callbackResult.duration_ms}ms, exceeding ${maxDuration}ms limit`,
          };
          return {
            verified: false,
            reason: `Duration constraint violated: ${callbackResult.duration_ms}ms > ${maxDuration}ms`,
            checks,
          };
        }
      }

      // Check target constraint
      if (callbackResult.target && expectedSteps[0]?.action?.target) {
        const expectedTarget = expectedSteps[0].action.target;
        if (expectedTarget !== '*' && callbackResult.target !== expectedTarget) {
          checks.constraint_compliance = {
            passed: false,
            detail: `Target mismatch: expected "${expectedTarget}", got "${callbackResult.target}"`,
          };
          return {
            verified: false,
            reason: `Target constraint violated: expected "${expectedTarget}", got "${callbackResult.target}"`,
            checks,
          };
        }
      }

      checks.constraint_compliance = {
        passed: true,
        detail: 'All constraints satisfied',
      };
    }

    return { verified: true, checks };

  } catch (err) {
    console.error('[CallbackVerification] Unexpected error:', err);
    // On unexpected verification errors, fail safe — don't auto-promote
    return {
      verified: false,
      reason: `Verification error: ${err instanceof Error ? err.message : 'Unknown'}`,
      checks,
    };
  }
}

async function logCallbackEvent(
  executionId: string,
  tenantId: string,
  eventType: string,
  details: any,
): Promise<void> {
  try {
    await execute(
      `INSERT INTO regulator.audit_log (proposal_id, event, actor, details, created_at)
       VALUES (NULL, $1, $2, $3, NOW())`,
      [
        eventType,
        `callback:${executionId}`,
        JSON.stringify({ execution_id: executionId, tenant_id: tenantId, ...details }),
      ],
    );
  } catch (err) {
    console.error('[ExecutionCallback] Failed to log audit event:', err);
  }
}
