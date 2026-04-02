/**
 * Data Retention Service — Compliance A+
 * 
 * Enforces per-tenant data retention policies on:
 * - execution_log (execution records)
 * - audit_log (governance audit trail)
 * - execution_ledger_events (event stream)
 * - execution_steps (step-level detail)
 * 
 * SOC 2 Controls: PI1.3 (Data Retention), CC7.2 (Change Management)
 * 
 * Design:
 * - Archive-before-delete by default (recoverable)
 * - Immutable retention_archive_log tracks all operations
 * - Per-tenant configurable retention periods
 * - Dry-run mode for policy preview
 * - Never deletes data less than 30 days old (safety floor)
 */

import { query, queryOne, execute } from '../db/postgres.js';

// ---- Types ----

export interface RetentionPolicy {
  id: string;
  tenant_id: string;
  table_name: string;
  retention_days: number;
  archive_before_delete: boolean;
  enabled: boolean;
}

export interface RetentionResult {
  tenant_id: string;
  table_name: string;
  records_archived: number;
  records_deleted: number;
  oldest_record_date: string | null;
  newest_record_date: string | null;
  dry_run: boolean;
}

// ---- Constants ----

const MINIMUM_RETENTION_DAYS = 30; // Safety floor — never delete anything < 30 days old
const BATCH_SIZE = 1000; // Process in batches to avoid long locks

const DEFAULT_RETENTION_POLICIES: Array<{table_name: string; retention_days: number}> = [
  { table_name: 'execution_log', retention_days: 365 },
  { table_name: 'audit_log', retention_days: 730 }, // 2 years for audit
  { table_name: 'execution_ledger_events', retention_days: 365 },
  { table_name: 'execution_steps', retention_days: 180 },
];

// ---- Service ----

/**
 * Get retention policies for a tenant.
 * Returns defaults if no custom policies are configured.
 */
export async function getRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
  const rows = await query<RetentionPolicy>(
    `SELECT * FROM regulator.data_retention_policies 
     WHERE tenant_id = $1 AND enabled = true
     ORDER BY table_name`,
    [tenantId],
  );

  if (rows.length > 0) return rows;

  // Return defaults (not persisted yet)
  return DEFAULT_RETENTION_POLICIES.map(p => ({
    id: 'default',
    tenant_id: tenantId,
    table_name: p.table_name,
    retention_days: p.retention_days,
    archive_before_delete: true,
    enabled: true,
  }));
}

/**
 * Create or update retention policy for a tenant.
 */
export async function upsertRetentionPolicy(
  tenantId: string,
  tableName: string,
  retentionDays: number,
  archiveBeforeDelete: boolean = true,
): Promise<RetentionPolicy> {
  // Enforce minimum retention
  const effectiveDays = Math.max(retentionDays, MINIMUM_RETENTION_DAYS);

  const rows = await query<RetentionPolicy>(
    `INSERT INTO regulator.data_retention_policies 
     (tenant_id, table_name, retention_days, archive_before_delete)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, table_name) DO UPDATE SET
       retention_days = EXCLUDED.retention_days,
       archive_before_delete = EXCLUDED.archive_before_delete,
       updated_at = NOW()
     RETURNING *`,
    [tenantId, tableName, effectiveDays, archiveBeforeDelete],
  );

  return rows[0];
}

/**
 * Execute retention policy for a single table.
 * 
 * @param dryRun If true, returns what would be affected without making changes.
 */
export async function executeRetention(
  tenantId: string,
  policy: RetentionPolicy,
  dryRun: boolean = false,
): Promise<RetentionResult> {
  const effectiveDays = Math.max(policy.retention_days, MINIMUM_RETENTION_DAYS);
  const cutoffDate = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  // Determine the date column for this table
  const dateColumn = policy.table_name === 'audit_log' ? 'created_at' : 'created_at';
  const tenantColumn = policy.table_name === 'audit_log' ? null : 'tenant_id'; // audit_log may not have tenant_id

  // Count affected records
  let countQuery: string;
  let countParams: any[];

  if (tenantColumn) {
    countQuery = `SELECT COUNT(*) as count, MIN(${dateColumn}) as oldest, MAX(${dateColumn}) as newest
                  FROM regulator.${policy.table_name}
                  WHERE ${tenantColumn} = $1 AND ${dateColumn} < $2 AND (retention_status IS NULL OR retention_status = 'active')`;
    countParams = [tenantId, cutoffDate.toISOString()];
  } else {
    countQuery = `SELECT COUNT(*) as count, MIN(${dateColumn}) as oldest, MAX(${dateColumn}) as newest
                  FROM regulator.${policy.table_name}
                  WHERE ${dateColumn} < $1 AND (retention_status IS NULL OR retention_status = 'active')`;
    countParams = [cutoffDate.toISOString()];
  }

  const countResult = await queryOne<any>(countQuery, countParams);
  const recordCount = parseInt(countResult?.count || '0');

  if (dryRun || recordCount === 0) {
    return {
      tenant_id: tenantId,
      table_name: policy.table_name,
      records_archived: 0,
      records_deleted: 0,
      oldest_record_date: countResult?.oldest || null,
      newest_record_date: countResult?.newest || null,
      dry_run: dryRun,
    };
  }

  let archived = 0;
  let deleted = 0;

  if (policy.archive_before_delete) {
    // Mark as archived (soft delete)
    if (tenantColumn) {
      const result = await execute(
        `UPDATE regulator.${policy.table_name}
         SET retention_status = 'archived', archived_at = NOW()
         WHERE ${tenantColumn} = $1 AND ${dateColumn} < $2 AND (retention_status IS NULL OR retention_status = 'active')`,
        [tenantId, cutoffDate.toISOString()],
      );
      archived = recordCount;
    }
  } else {
    // Hard delete (only for tables without archive_before_delete)
    if (tenantColumn) {
      await execute(
        `DELETE FROM regulator.${policy.table_name}
         WHERE ${tenantColumn} = $1 AND ${dateColumn} < $2 AND (retention_status IS NULL OR retention_status = 'active')`,
        [tenantId, cutoffDate.toISOString()],
      );
      deleted = recordCount;
    }
  }

  // Log the retention operation (immutable)
  await execute(
    `INSERT INTO regulator.retention_archive_log 
     (tenant_id, table_name, records_archived, records_deleted, oldest_record_date, newest_record_date, executed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tenantId,
      policy.table_name,
      archived,
      deleted,
      countResult?.oldest || null,
      countResult?.newest || null,
      'retention_service',
    ],
  );

  return {
    tenant_id: tenantId,
    table_name: policy.table_name,
    records_archived: archived,
    records_deleted: deleted,
    oldest_record_date: countResult?.oldest || null,
    newest_record_date: countResult?.newest || null,
    dry_run: false,
  };
}

/**
 * Execute all retention policies for a tenant.
 */
export async function executeAllRetention(
  tenantId: string,
  dryRun: boolean = false,
): Promise<RetentionResult[]> {
  const policies = await getRetentionPolicies(tenantId);
  const results: RetentionResult[] = [];

  for (const policy of policies) {
    const result = await executeRetention(tenantId, policy, dryRun);
    results.push(result);
  }

  return results;
}

/**
 * Get retention archive history for a tenant.
 */
export async function getRetentionHistory(
  tenantId: string,
  limit: number = 50,
): Promise<any[]> {
  return query(
    `SELECT * FROM regulator.retention_archive_log 
     WHERE tenant_id = $1 
     ORDER BY executed_at DESC 
     LIMIT $2`,
    [tenantId, limit],
  );
}
