/**
 * Execution Persistence Service — Phase 5
 * 
 * Writes the full execution lifecycle to all tracking tables.
 * All data is redacted before persistence.
 * 
 * Tables written:
 * - execution_log (main record)
 * - execution_steps (per-step detail)
 * - execution_ledger_events (event stream)
 * - audit_log (governance audit)
 */

import { query, queryOne, execute } from '../db/postgres.js';
import { redactSecrets, type ResolvedSecretMap } from './secretRedaction.js';

// ---- Types ----

export interface ExecutionRecord {
  execution_id: string;
  tenant_id: string;
  warrant_id: string | null;
  proposal_id?: string | null;
  execution_mode: 'managed' | 'delegated';
  state: string;
  risk_tier: string;
  objective: string;
  steps: any[];
  timeline: any[];
  result: any | null;
}

export interface StepRecord {
  execution_id: string;
  step_index: number;
  step_name: string;
  tier: string;
  action: any;
  params: any;
  adapter_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  latency_ms: number;
  result: any | null;
  error: string | null;
}

// ---- Valid States ----

const VALID_STATES = ['planned', 'approved', 'executing', 'awaiting_callback', 'verifying', 'complete', 'failed', 'cancelled'];
const TERMINAL_STATES = ['complete', 'failed', 'cancelled'];

const VALID_TRANSITIONS: Record<string, string[]> = {
  planned: ['approved', 'cancelled'],
  approved: ['executing', 'cancelled'],
  executing: ['verifying', 'failed', 'awaiting_callback'],
  awaiting_callback: ['verifying', 'failed'],
  verifying: ['complete', 'failed'],
};

// ---- Validation ----

export function validateStateTransition(from: string, to: string): boolean {
  if (TERMINAL_STATES.includes(from)) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---- Create ----

export async function createExecution(
  record: ExecutionRecord,
  secrets?: ResolvedSecretMap,
): Promise<void> {
  const redacted = redactSecrets(record, secrets || {});

  await query(
    `INSERT INTO regulator.execution_log 
     (execution_id, tenant_id, warrant_id, proposal_id, execution_mode, state, risk_tier, objective, steps, timeline, result, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
    [
      redacted.execution_id,
      redacted.tenant_id,
      redacted.warrant_id,
      redacted.proposal_id || null,
      redacted.execution_mode,
      redacted.state,
      redacted.risk_tier,
      redacted.objective,
      JSON.stringify(redacted.steps),
      JSON.stringify(redacted.timeline),
      redacted.result ? JSON.stringify(redacted.result) : null,
    ],
  );

  // Emit ledger event
  await emitLedgerEvent(redacted.execution_id, redacted.tenant_id, 'state:planned', 'plan', {
    objective: redacted.objective,
    risk_tier: redacted.risk_tier,
    execution_mode: redacted.execution_mode,
  });
}

// ---- Update State ----

export async function transitionState(
  executionId: string,
  tenantId: string,
  newState: string,
  detail: string,
  extras?: { result?: any; error?: string; actor?: string },
  secrets?: ResolvedSecretMap,
): Promise<boolean> {
  // Get current state
  const current = await queryOne<{ state: string }>(
    'SELECT state FROM regulator.execution_log WHERE execution_id = $1 AND tenant_id = $2',
    [executionId, tenantId],
  );

  if (!current) {
    console.error(`[ExecutionPersistence] Execution ${executionId} not found`);
    return false;
  }

  if (!validateStateTransition(current.state, newState)) {
    console.error(`[ExecutionPersistence] Invalid transition: ${current.state} → ${newState}`);
    return false;
  }

  const isTerminal = TERMINAL_STATES.includes(newState);
  const timelineEntry = redactSecrets({
    state: newState,
    detail,
    timestamp: new Date().toISOString(),
    actor: extras?.actor,
    error: extras?.error,
  }, secrets || {});

  const redactedResult = extras?.result ? redactSecrets(extras.result, secrets || {}) : null;

  await query(
    `UPDATE regulator.execution_log 
     SET state = $1,
         timeline = timeline || $2::jsonb,
         result = CASE WHEN $3::jsonb IS NOT NULL THEN $3::jsonb ELSE result END,
         updated_at = NOW(),
         completed_at = CASE WHEN $4 THEN NOW() ELSE completed_at END
     WHERE execution_id = $5 AND tenant_id = $6`,
    [
      newState,
      JSON.stringify([timelineEntry]),
      redactedResult ? JSON.stringify(redactedResult) : null,
      isTerminal,
      executionId,
      tenantId,
    ],
  );

  // Emit ledger event
  const stage = ['planned', 'approved', 'cancelled'].includes(newState) ? 'plan'
    : ['executing', 'awaiting_callback', 'failed'].includes(newState) ? 'execute'
    : 'verify';

  await emitLedgerEvent(executionId, tenantId, `state:${newState}`, stage, {
    detail,
    previous_state: current.state,
    ...(extras?.error ? { error: extras.error } : {}),
  });

  return true;
}

// ---- Persist Step ----

export async function persistStep(
  step: StepRecord,
  secrets?: ResolvedSecretMap,
): Promise<void> {
  const redacted = redactSecrets(step, secrets || {});

  await query(
    `INSERT INTO regulator.execution_steps 
     (execution_id, step_index, step_name, tier, action, params, adapter_id, status, started_at, completed_at, latency_ms, result, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (execution_id, step_index) DO UPDATE SET
       status = EXCLUDED.status,
       completed_at = EXCLUDED.completed_at,
       latency_ms = EXCLUDED.latency_ms,
       result = EXCLUDED.result,
       error = EXCLUDED.error`,
    [
      redacted.execution_id,
      redacted.step_index,
      redacted.step_name,
      redacted.tier,
      JSON.stringify(redacted.action),
      JSON.stringify(redacted.params),
      redacted.adapter_id,
      redacted.status,
      redacted.started_at,
      redacted.completed_at,
      redacted.latency_ms,
      redacted.result ? JSON.stringify(redacted.result) : null,
      redacted.error,
    ],
  );

  // Emit step event
  await emitLedgerEvent(redacted.execution_id, '', `step.${redacted.status}`, 'execute', {
    step_index: redacted.step_index,
    step_name: redacted.step_name,
    adapter_id: redacted.adapter_id,
    latency_ms: redacted.latency_ms,
  });
}

// ---- Update Steps on Execution Log ----

export async function updateExecutionSteps(
  executionId: string,
  tenantId: string,
  steps: any[],
  secrets?: ResolvedSecretMap,
): Promise<void> {
  const redacted = redactSecrets(steps, secrets || {});
  await query(
    `UPDATE regulator.execution_log SET steps = $1, updated_at = NOW() WHERE execution_id = $2 AND tenant_id = $3`,
    [JSON.stringify(redacted), executionId, tenantId],
  );
}

// ---- Ledger Event ----

async function emitLedgerEvent(
  executionId: string,
  tenantId: string,
  eventType: string,
  stage: string,
  payload: any,
): Promise<void> {
  try {
    // Get next sequence number
    const seqResult = await queryOne<{ max_seq: number }>(
      `SELECT COALESCE(MAX(sequence_num), 0) + 1 as max_seq 
       FROM regulator.execution_ledger_events 
       WHERE execution_id = $1`,
      [executionId],
    );
    const seqNum = seqResult?.max_seq || 1;

    await query(
      `INSERT INTO regulator.execution_ledger_events 
       (event_id, tenant_id, execution_id, event_type, stage, event_timestamp, sequence_num, payload_json, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, NOW())`,
      [
        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tenantId,
        executionId,
        eventType,
        stage,
        seqNum,
        JSON.stringify(payload),
      ],
    );
  } catch (err) {
    // Don't fail the execution if ledger event fails
    console.error('[ExecutionPersistence] Failed to emit ledger event:', err);
  }
}

// ---- Audit Log ----

export async function logExecutionAudit(
  executionId: string,
  tenantId: string,
  event: string,
  actor: string,
  details: any,
  warrantId?: string,
  riskTier?: string,
): Promise<void> {
  try {
    const redacted = redactSecrets(details);
    await query(
      `INSERT INTO regulator.audit_log (proposal_id, warrant_id, event, actor, risk_tier, details, created_at)
       VALUES (NULL, $1, $2, $3, $4, $5, NOW())`,
      [
        warrantId || null,
        event,
        actor,
        riskTier ? parseInt(riskTier.replace('T', '')) : null,
        JSON.stringify({ execution_id: executionId, tenant_id: tenantId, ...redacted }),
      ],
    );
  } catch (err) {
    console.error('[ExecutionPersistence] Failed to log audit:', err);
  }
}
