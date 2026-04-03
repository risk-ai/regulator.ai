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
   * Save warrant to database (adapted to existing schema)
   */
  async saveWarrant(warrant: Partial<WarrantRecord>): Promise<void> {
    // Adapt to existing schema: id (UUID), proposal_id, signature, expires_at, etc.
    // Store Vienna warrant fields in the 'scope' JSONB column
    const sql = `
      INSERT INTO regulator.warrants (
        intent_id, agent_id, risk_tier, scope, signature, expires_at,
        revoked, issued_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      )
      RETURNING id
    `;

    const scope = {
      warrant_id: warrant.warrant_id,
      change_id: warrant.change_id,
      version: warrant.version || 2,
      truth_snapshot_id: warrant.truth_snapshot_id,
      truth_snapshot_hash: warrant.truth_snapshot_hash,
      plan_id: warrant.plan_id,
      approval_id: warrant.approval_id,
      approval_ids: warrant.approval_ids || [],
      objective: warrant.objective,
      allowed_actions: warrant.allowed_actions || [],
      forbidden_actions: warrant.forbidden_actions || [],
      constraints: warrant.constraints || {},
      justification: warrant.justification,
      rollback_plan: warrant.rollback_plan,
      trading_safety: warrant.trading_safety || { trading_in_scope: false, risk: 'none' },
      enhanced_audit: warrant.enhanced_audit || false,
      status: warrant.status || 'issued',
      invalidated_at: warrant.invalidated_at,
      invalidation_reason: warrant.invalidation_reason,
    };

    const result = await queryOne<{ id: string }>(sql, [
      warrant.plan_id || warrant.warrant_id, // intent_id
      warrant.issued_by || 'framework_api', // agent_id
      warrant.risk_tier || 'T0',
      JSON.stringify(scope),
      warrant.signature,
      warrant.expires_at,
      warrant.status === 'invalidated', // revoked boolean
      warrant.issued_by || 'vienna',
    ]);

    console.log(`[WarrantAdapter] Saved warrant ${warrant.warrant_id} (DB ID: ${result?.id}) for tenant ${this.tenantId}`);
  }

  /**
   * Load warrant from database (adapted to existing schema)
   */
  async loadWarrant(warrantId: string): Promise<WarrantRecord | null> {
    // Search for warrant_id in the scope JSONB column
    const sql = `
      SELECT 
        id, intent_id, agent_id, risk_tier, scope, signature, expires_at,
        revoked, revoked_at, revoked_reason, issued_by, created_at
      FROM regulator.warrants
      WHERE scope->>'warrant_id' = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = await queryOne<any>(sql, [warrantId]);
    
    if (!row) {
      return null;
    }

    // Extract Vienna warrant structure from scope JSONB
    const scope = typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope;
    
    return {
      warrant_id: scope.warrant_id || warrantId,
      change_id: scope.change_id || row.intent_id,
      version: scope.version || 2,
      issued_by: row.issued_by,
      issued_at: row.created_at,
      expires_at: row.expires_at,
      risk_tier: row.risk_tier,
      truth_snapshot_id: scope.truth_snapshot_id || '',
      truth_snapshot_hash: scope.truth_snapshot_hash || '',
      plan_id: scope.plan_id || row.intent_id,
      approval_id: scope.approval_id || null,
      approval_ids: scope.approval_ids || [],
      objective: scope.objective || '',
      allowed_actions: scope.allowed_actions || [],
      forbidden_actions: scope.forbidden_actions || [],
      constraints: scope.constraints || {},
      justification: scope.justification || null,
      rollback_plan: scope.rollback_plan || null,
      trading_safety: scope.trading_safety || { trading_in_scope: false, risk: 'none' },
      enhanced_audit: scope.enhanced_audit || false,
      status: row.revoked ? 'invalidated' : (scope.status || 'issued'),
      invalidated_at: row.revoked_at || scope.invalidated_at || null,
      invalidation_reason: row.revoked_reason || scope.invalidation_reason || null,
      signature: row.signature,
      tenant_id: this.tenantId,
      created_at: row.created_at,
    };
  }

  /**
   * List warrants (with optional filters) - adapted to existing schema
   */
  async listWarrants(filters: {
    status?: 'issued' | 'invalidated';
    risk_tier?: string;
    limit?: number;
  } = {}): Promise<WarrantRecord[]> {
    let sql = `
      SELECT 
        id, intent_id, agent_id, risk_tier, scope, signature, expires_at,
        revoked, revoked_at, revoked_reason, issued_by, created_at
      FROM regulator.warrants
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.status === 'invalidated') {
      sql += ` AND revoked = true`;
    } else if (filters.status === 'issued') {
      sql += ` AND revoked = false`;
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

    return rows.map(row => {
      const scope = typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope;
      
      return {
        warrant_id: scope.warrant_id || row.id,
        change_id: scope.change_id || row.intent_id,
        version: scope.version || 2,
        issued_by: row.issued_by,
        issued_at: row.created_at,
        expires_at: row.expires_at,
        risk_tier: row.risk_tier,
        truth_snapshot_id: scope.truth_snapshot_id || '',
        truth_snapshot_hash: scope.truth_snapshot_hash || '',
        plan_id: scope.plan_id || row.intent_id,
        approval_id: scope.approval_id || null,
        approval_ids: scope.approval_ids || [],
        objective: scope.objective || '',
        allowed_actions: scope.allowed_actions || [],
        forbidden_actions: scope.forbidden_actions || [],
        constraints: scope.constraints || {},
        justification: scope.justification || null,
        rollback_plan: scope.rollback_plan || null,
        trading_safety: scope.trading_safety || { trading_in_scope: false, risk: 'none' },
        enhanced_audit: scope.enhanced_audit || false,
        status: row.revoked ? 'invalidated' : (scope.status || 'issued'),
        invalidated_at: row.revoked_at || scope.invalidated_at || null,
        invalidation_reason: row.revoked_reason || scope.invalidation_reason || null,
        signature: row.signature,
        tenant_id: this.tenantId,
        created_at: row.created_at,
      };
    });
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
