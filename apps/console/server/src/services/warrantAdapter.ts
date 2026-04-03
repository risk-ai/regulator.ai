/**
 * Warrant Adapter — Postgres Implementation
 * 
 * Provides persistence and audit logging for Vienna Warrant system.
 * Implements the adapter interface required by services/vienna-lib/governance/warrant.js
 */

import { query, queryOne, execute } from '../db/postgres.js';
import { eventBus } from './eventBus.js';

export interface WarrantRecord {
  warrant_id: string;
  change_id: string;
  version: number;
  issued_by: string;
  issued_at: string;
  expires_at: string;
  risk_tier: string;
  truth_snapshot_id: string;
  truth_snapshot_hash: string;
  plan_id: string;
  approval_id: string | null;
  approval_ids: string[];
  objective: string;
  allowed_actions: string[];
  forbidden_actions: string[];
  constraints: Record<string, any>;
  justification: string | null;
  rollback_plan: string | null;
  trading_safety: {
    trading_in_scope: boolean;
    risk: string;
  };
  enhanced_audit: boolean;
  status: 'issued' | 'invalidated';
  invalidated_at: string | null;
  invalidation_reason: string | null;
  signature: string;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface TruthSnapshot {
  truth_snapshot_id: string;
  truth_snapshot_hash: string;
  created_at: string;
  snapshot_data: Record<string, any>;
}

export class WarrantAdapter {
  private tenantId: string;

  constructor(tenantId: string = 'default') {
    this.tenantId = tenantId;
  }

  /**
   * Save warrant to database
   */
  async saveWarrant(warrant: Partial<WarrantRecord>): Promise<void> {
    const sql = `
      INSERT INTO regulator.warrants (
        warrant_id, change_id, version, issued_by, issued_at, expires_at, risk_tier,
        truth_snapshot_id, truth_snapshot_hash, plan_id, approval_id, approval_ids,
        objective, allowed_actions, forbidden_actions, constraints,
        justification, rollback_plan, trading_safety, enhanced_audit,
        status, invalidated_at, invalidation_reason, signature, tenant_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (warrant_id) DO UPDATE SET
        status = EXCLUDED.status,
        invalidated_at = EXCLUDED.invalidated_at,
        invalidation_reason = EXCLUDED.invalidation_reason,
        updated_at = NOW()
    `;

    await execute(sql, [
      warrant.warrant_id,
      warrant.change_id,
      warrant.version || 2,
      warrant.issued_by || 'vienna',
      warrant.issued_at,
      warrant.expires_at,
      warrant.risk_tier,
      warrant.truth_snapshot_id,
      warrant.truth_snapshot_hash,
      warrant.plan_id,
      warrant.approval_id,
      JSON.stringify(warrant.approval_ids || []),
      warrant.objective,
      JSON.stringify(warrant.allowed_actions || []),
      JSON.stringify(warrant.forbidden_actions || []),
      JSON.stringify(warrant.constraints || {}),
      warrant.justification,
      warrant.rollback_plan,
      JSON.stringify(warrant.trading_safety || { trading_in_scope: false, risk: 'none' }),
      warrant.enhanced_audit || false,
      warrant.status || 'issued',
      warrant.invalidated_at,
      warrant.invalidation_reason,
      warrant.signature,
      this.tenantId,
    ]);

    console.log(`[WarrantAdapter] Saved warrant ${warrant.warrant_id} for tenant ${this.tenantId}`);
  }

  /**
   * Load warrant from database
   */
  async loadWarrant(warrantId: string): Promise<WarrantRecord | null> {
    const sql = `
      SELECT 
        warrant_id, change_id, version, issued_by, issued_at, expires_at, risk_tier,
        truth_snapshot_id, truth_snapshot_hash, plan_id, approval_id, approval_ids,
        objective, allowed_actions, forbidden_actions, constraints,
        justification, rollback_plan, trading_safety, enhanced_audit,
        status, invalidated_at, invalidation_reason, signature, tenant_id,
        created_at, updated_at
      FROM regulator.warrants
      WHERE warrant_id = $1 AND tenant_id = $2
    `;

    const row = await queryOne<any>(sql, [warrantId, this.tenantId]);
    
    if (!row) {
      return null;
    }

    // Parse JSON fields
    return {
      ...row,
      approval_ids: typeof row.approval_ids === 'string' ? JSON.parse(row.approval_ids) : row.approval_ids,
      allowed_actions: typeof row.allowed_actions === 'string' ? JSON.parse(row.allowed_actions) : row.allowed_actions,
      forbidden_actions: typeof row.forbidden_actions === 'string' ? JSON.parse(row.forbidden_actions) : row.forbidden_actions,
      constraints: typeof row.constraints === 'string' ? JSON.parse(row.constraints) : row.constraints,
      trading_safety: typeof row.trading_safety === 'string' ? JSON.parse(row.trading_safety) : row.trading_safety,
    };
  }

  /**
   * List warrants (with optional filters)
   */
  async listWarrants(filters: {
    status?: 'issued' | 'invalidated';
    risk_tier?: string;
    limit?: number;
  } = {}): Promise<WarrantRecord[]> {
    let sql = `
      SELECT 
        warrant_id, change_id, version, issued_by, issued_at, expires_at, risk_tier,
        truth_snapshot_id, truth_snapshot_hash, plan_id, approval_id, approval_ids,
        objective, allowed_actions, forbidden_actions, constraints,
        justification, rollback_plan, trading_safety, enhanced_audit,
        status, invalidated_at, invalidation_reason, signature, tenant_id,
        created_at, updated_at
      FROM regulator.warrants
      WHERE tenant_id = $1
    `;

    const params: any[] = [this.tenantId];
    let paramIndex = 2;

    if (filters.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.risk_tier) {
      sql += ` AND risk_tier = $${paramIndex}`;
      params.push(filters.risk_tier);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    const rows = await query<any>(sql, params);

    return rows.map(row => ({
      ...row,
      approval_ids: typeof row.approval_ids === 'string' ? JSON.parse(row.approval_ids) : row.approval_ids,
      allowed_actions: typeof row.allowed_actions === 'string' ? JSON.parse(row.allowed_actions) : row.allowed_actions,
      forbidden_actions: typeof row.forbidden_actions === 'string' ? JSON.parse(row.forbidden_actions) : row.forbidden_actions,
      constraints: typeof row.constraints === 'string' ? JSON.parse(row.constraints) : row.constraints,
      trading_safety: typeof row.trading_safety === 'string' ? JSON.parse(row.trading_safety) : row.trading_safety,
    }));
  }

  /**
   * Load truth snapshot
   * For now, return a synthetic snapshot (real implementation would query truth_snapshots table)
   */
  async loadTruthSnapshot(truthSnapshotId: string): Promise<TruthSnapshot> {
    // TODO: Implement real truth snapshot persistence
    // For now, generate synthetic snapshot
    const now = new Date().toISOString();
    return {
      truth_snapshot_id: truthSnapshotId,
      truth_snapshot_hash: `hash_${truthSnapshotId}`,
      created_at: now,
      snapshot_data: {
        timestamp: now,
        state: 'operational',
      },
    };
  }

  /**
   * Emit audit event to both database and event bus
   */
  async emitAudit(event: {
    event_type: string;
    warrant_id?: string;
    change_id?: string;
    risk_tier?: string;
    issued_at?: string;
    severity?: string;
    [key: string]: any;
  }): Promise<void> {
    // Store in audit_log table
    const sql = `
      INSERT INTO regulator.audit_log (
        tenant_id, event, warrant_id, risk_tier, details, severity, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    await execute(sql, [
      this.tenantId,
      event.event_type,
      event.warrant_id || null,
      event.risk_tier || null,
      JSON.stringify(event),
      event.severity || 'info',
    ]);

    // Emit to event bus for real-time notifications
    if (event.event_type === 'warrant_issued') {
      eventBus.emitWarrantIssued(
        {
          warrant_id: event.warrant_id!,
          intent_id: event.change_id || 'unknown',
          agent_id: 'system',
          expires_at: event.issued_at || new Date().toISOString(),
          risk_tier: event.risk_tier || 'T0',
        },
        this.tenantId
      );
    } else if (event.event_type === 'warrant_tamper_detected') {
      eventBus.emitWarrantTampered(
        {
          warrant_id: event.warrant_id!,
          tamper_type: 'signature_mismatch',
          detected_at: new Date().toISOString(),
          agent_id: undefined,
        },
        this.tenantId
      );
    }

    console.log(`[WarrantAdapter] Audit event: ${event.event_type} for warrant ${event.warrant_id}`);
  }
}
