/**
 * Phase 16.3 — Queue Repository
 *
 * Durable queue storage with State Graph integration.
 */
import { assertValidQueueTransition } from "./state-machine";
import { getStateGraph } from "../state/state-graph";
export class QueueRepository {
    stateGraph = getStateGraph();
    async enqueueItem(input) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const id = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const retry = {
            attempt_count: 0,
            last_attempt_at: undefined,
            next_retry_at: undefined,
            last_error_code: undefined,
            last_error_message: undefined,
        };
        const row = {
            id,
            state: input.initial_state,
            priority: input.priority,
            blocked_reason: input.blocked_reason,
            resume_condition_json: JSON.stringify(input.resume_condition),
            retry_policy_json: input.retry_policy ? JSON.stringify(input.retry_policy) : null,
            retry_json: JSON.stringify(retry),
            requested_by: input.requested_by,
            approved_by: input.approved_by || null,
            resumed_by: null,
            plan_id: input.plan_id,
            execution_id: input.execution_id || null,
            step_id: input.step_id,
            intent_id: input.intent_id,
            warrant_id: input.warrant_id || null,
            approval_id: input.approval_id || null,
            verification_template_id: input.verification_template_id || null,
            resource_keys_json: JSON.stringify(input.resource_keys),
            risk_tier: input.risk_tier,
            policy_snapshot_id: null,
            created_at: now,
            updated_at: now,
            queued_at: now,
            eligible_at: null,
            started_at: null,
            completed_at: null,
            scheduler_lease_id: null,
            scheduler_lease_expires_at: null,
            last_transition_at: now,
            transition_reason: "ENQUEUED",
            metadata_json: input.metadata ? JSON.stringify(input.metadata) : null,
        };
        const stmt = db.prepare(`
      INSERT INTO queue_items (
        id, state, priority, blocked_reason, resume_condition_json,
        retry_policy_json, retry_json, requested_by, approved_by, resumed_by,
        plan_id, execution_id, step_id, intent_id, warrant_id, approval_id,
        verification_template_id, resource_keys_json, risk_tier, policy_snapshot_id,
        created_at, updated_at, queued_at, eligible_at, started_at, completed_at,
        scheduler_lease_id, scheduler_lease_expires_at, last_transition_at,
        transition_reason, metadata_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
        stmt.run(row.id, row.state, row.priority, row.blocked_reason, row.resume_condition_json, row.retry_policy_json, row.retry_json, row.requested_by, row.approved_by, row.resumed_by, row.plan_id, row.execution_id, row.step_id, row.intent_id, row.warrant_id, row.approval_id, row.verification_template_id, row.resource_keys_json, row.risk_tier, row.policy_snapshot_id, row.created_at, row.updated_at, row.queued_at, row.eligible_at, row.started_at, row.completed_at, row.scheduler_lease_id, row.scheduler_lease_expires_at, row.last_transition_at, row.transition_reason, row.metadata_json);
        return this.rowToItem(row);
    }
    /**
     * Phase 16.4 Stage 1: Atomic lease acquisition
     *
     * Uses queue_leases table for exclusive orchestration claims.
     * Returns true if lease acquired, false if conflict.
     */
    async acquireSchedulerLease(queueItemId, leaseId, ttlMs) {
        const { LeaseManager } = require("./lease-manager");
        const leaseManager = new LeaseManager();
        const result = await leaseManager.acquireLease(queueItemId, leaseId, ttlMs);
        return result.acquired;
    }
    /**
     * Phase 16.4 Stage 1: Release scheduler lease
     */
    async releaseSchedulerLease(queueItemId, leaseId) {
        const { LeaseManager } = require("./lease-manager");
        const leaseManager = new LeaseManager();
        await leaseManager.releaseLease(leaseId, leaseId); // Using leaseId as workerId for now
    }
    async getItem(id) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const row = db.prepare("SELECT * FROM queue_items WHERE id = ?").get(id);
        return row ? this.rowToItem(row) : null;
    }
    async listEligibleItems(limit = 100) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const rows = db.prepare(`
      SELECT * FROM queue_items
      WHERE state IN ('READY', 'RETRY_SCHEDULED')
        AND (state = 'READY' OR (state = 'RETRY_SCHEDULED' AND eligible_at <= ?))
        AND (scheduler_lease_id IS NULL OR scheduler_lease_expires_at <= ?)
      ORDER BY priority ASC, queued_at ASC, id ASC
      LIMIT ?
    `).all(now, now, limit);
        return rows.map(row => this.rowToItem(row));
    }
    async transitionItem(input) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        // Validate transition
        assertValidQueueTransition(input.from_state, input.to_state);
        const now = new Date().toISOString();
        const updates = {
            state: input.to_state,
            updated_at: now,
            last_transition_at: now,
            transition_reason: input.reason,
        };
        if (input.resumed_by) {
            updates.resumed_by = input.resumed_by;
        }
        if (input.blocked_reason) {
            updates.blocked_reason = input.blocked_reason;
        }
        if (input.resume_condition) {
            updates.resume_condition_json = JSON.stringify(input.resume_condition);
        }
        if (input.next_retry_at) {
            updates.eligible_at = input.next_retry_at;
        }
        if (input.metadata) {
            updates.metadata_json = JSON.stringify(input.metadata);
        }
        if (input.to_state === "RUNNING") {
            updates.started_at = now;
        }
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(input.to_state)) {
            updates.completed_at = now;
        }
        const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(", ");
        const values = [...Object.values(updates), input.queue_item_id, input.from_state];
        const stmt = db.prepare(`
      UPDATE queue_items
      SET ${setClauses}
      WHERE id = ? AND state = ?
    `);
        const result = stmt.run(...values);
        if (result.changes === 0) {
            throw new Error(`Queue transition failed: item ${input.queue_item_id} not in state ${input.from_state}`);
        }
        const item = await this.getItem(input.queue_item_id);
        if (!item) {
            throw new Error(`Queue item ${input.queue_item_id} not found after transition`);
        }
        return item;
    }
    async acquireSchedulerLease(itemId, leaseId, ttlMs) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + ttlMs).toISOString();
        const stmt = db.prepare(`
      UPDATE queue_items
      SET scheduler_lease_id = ?, scheduler_lease_expires_at = ?, updated_at = ?
      WHERE id = ?
        AND (scheduler_lease_id IS NULL OR scheduler_lease_expires_at <= ?)
    `);
        const result = stmt.run(leaseId, expiresAt, now, itemId, now);
        return result.changes > 0;
    }
    async releaseSchedulerLease(itemId, leaseId) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const stmt = db.prepare(`
      UPDATE queue_items
      SET scheduler_lease_id = NULL, scheduler_lease_expires_at = NULL, updated_at = ?
      WHERE id = ? AND scheduler_lease_id = ?
    `);
        stmt.run(new Date().toISOString(), itemId, leaseId);
    }
    async listItemsByState(state, limit = 100) {
        return this.listByState(state, limit);
    }
    async listByState(state, limit = 100) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const rows = db.prepare(`
      SELECT * FROM queue_items
      WHERE state = ?
      ORDER BY priority ASC, queued_at ASC
      LIMIT ?
    `).all(state, limit);
        return rows.map(row => this.rowToItem(row));
    }
    async listByPlan(planId) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const rows = db.prepare(`
      SELECT * FROM queue_items
      WHERE plan_id = ?
      ORDER BY created_at ASC
    `).all(planId);
        return rows.map(row => this.rowToItem(row));
    }
    async listByApproval(approvalId) {
        await this.stateGraph.initialize();
        const db = this.stateGraph.db;
        const rows = db.prepare(`
      SELECT * FROM queue_items
      WHERE approval_id = ?
      ORDER BY created_at ASC
    `).all(approvalId);
        return rows.map(row => this.rowToItem(row));
    }
    rowToItem(row) {
        return {
            id: row.id,
            state: row.state,
            priority: row.priority,
            blocked_reason: row.blocked_reason || undefined,
            resume_condition: row.resume_condition_json ? JSON.parse(row.resume_condition_json) : undefined,
            retry_policy: row.retry_policy_json ? JSON.parse(row.retry_policy_json) : undefined,
            retry: JSON.parse(row.retry_json),
            requested_by: row.requested_by,
            approved_by: row.approved_by || undefined,
            resumed_by: row.resumed_by || undefined,
            plan_id: row.plan_id,
            execution_id: row.execution_id || undefined,
            step_id: row.step_id,
            intent_id: row.intent_id,
            warrant_id: row.warrant_id || undefined,
            approval_id: row.approval_id || undefined,
            verification_template_id: row.verification_template_id || undefined,
            resource_keys: JSON.parse(row.resource_keys_json),
            risk_tier: row.risk_tier,
            policy_snapshot_id: row.policy_snapshot_id || undefined,
            created_at: row.created_at,
            updated_at: row.updated_at,
            queued_at: row.queued_at,
            eligible_at: row.eligible_at || undefined,
            started_at: row.started_at || undefined,
            completed_at: row.completed_at || undefined,
            scheduler_lease_id: row.scheduler_lease_id || undefined,
            scheduler_lease_expires_at: row.scheduler_lease_expires_at || undefined,
            last_transition_at: row.last_transition_at,
            transition_reason: row.transition_reason || undefined,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
        };
    }
}
//# sourceMappingURL=repository.js.map