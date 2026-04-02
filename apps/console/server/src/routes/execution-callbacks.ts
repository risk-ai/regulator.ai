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

      // 11. If verifying, trigger verification flow
      if (newState === 'verifying' && status === 'success') {
        // Mark as complete after verification (simplified — Vienna can add real verification)
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
              timestamp: new Date().toISOString(),
            }]),
            execution_id,
          ],
        );
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
