/**
 * Phase 16.4 Stage 1 — Lease Manager
 *
 * Atomic lease acquisition, heartbeat, renewal, expiry detection.
 * Single-process scheduler with multi-worker-safe primitives.
 */
import { getStateGraph } from "../state/state-graph";
export class LeaseManager {
    stateGraph = getStateGraph();
    defaultTtlMs = 30000; // 30 seconds
    heartbeatIntervalMs = 10000; // 10 seconds
    async initialize() {
        await this.stateGraph.initialize();
    }
    /**
     * Acquire exclusive lease on queue item (atomic CAS)
     *
     * Only succeeds if no active lease exists.
     */
    async acquireLease(queueItemId, workerId, ttlMs = this.defaultTtlMs) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const leaseId = `lease_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const expiresAt = new Date(Date.now() + ttlMs).toISOString();
        try {
            // Check for existing active lease (atomic)
            const existing = db.prepare(`
        SELECT lease_id, worker_id, expires_at
        FROM queue_leases
        WHERE queue_item_id = ? AND status = 'ACTIVE'
        LIMIT 1
      `).get(queueItemId);
            if (existing) {
                // Check if expired (grace period check)
                const expiryTime = new Date(existing.expires_at).getTime();
                if (expiryTime > Date.now()) {
                    // Still active
                    return {
                        acquired: false,
                        reason: "ACTIVE_LEASE_EXISTS",
                        conflicting_lease_id: existing.lease_id,
                    };
                }
                // Lease expired, mark it as such
                db.prepare(`
          UPDATE queue_leases
          SET status = 'EXPIRED', updated_at = ?
          WHERE lease_id = ?
        `).run(now, existing.lease_id);
            }
            // Acquire new lease (atomic INSERT with UNIQUE constraint enforcement)
            const lease = {
                lease_id: leaseId,
                queue_item_id: queueItemId,
                worker_id: workerId,
                status: "ACTIVE",
                acquired_at: now,
                heartbeat_at: now,
                expires_at: expiresAt,
            };
            const stmt = db.prepare(`
        INSERT INTO queue_leases (
          lease_id, queue_item_id, worker_id, status,
          acquired_at, heartbeat_at, expires_at, metadata_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(lease.lease_id, lease.queue_item_id, lease.worker_id, lease.status, lease.acquired_at, lease.heartbeat_at, lease.expires_at, null, now, now);
            // Update queue_item with lease metadata
            db.prepare(`
        UPDATE queue_items
        SET scheduler_lease_id = ?,
            scheduler_lease_expires_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(leaseId, expiresAt, now, queueItemId);
            return { acquired: true, lease };
        }
        catch (error) {
            // UNIQUE constraint violation means concurrent acquisition
            if (error.message.includes("UNIQUE constraint")) {
                return {
                    acquired: false,
                    reason: "CONCURRENT_ACQUISITION_CONFLICT",
                };
            }
            throw error;
        }
    }
    /**
     * Renew lease (heartbeat + extend expiry)
     */
    async renewLease(leaseId, workerId, ttlMs = this.defaultTtlMs) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const newExpiresAt = new Date(Date.now() + ttlMs).toISOString();
        const result = db.prepare(`
      UPDATE queue_leases
      SET heartbeat_at = ?,
          expires_at = ?,
          updated_at = ?
      WHERE lease_id = ?
        AND worker_id = ?
        AND status = 'ACTIVE'
    `).run(now, newExpiresAt, now, leaseId, workerId);
        if (result.changes === 0) {
            return {
                renewed: false,
                reason: "LEASE_NOT_FOUND_OR_NOT_OWNED",
            };
        }
        // Update queue_item expiry
        db.prepare(`
      UPDATE queue_items
      SET scheduler_lease_expires_at = ?, updated_at = ?
      WHERE scheduler_lease_id = ?
    `).run(newExpiresAt, now, leaseId);
        return {
            renewed: true,
            new_expires_at: newExpiresAt,
        };
    }
    /**
     * Release lease (normal completion)
     */
    async releaseLease(leaseId, workerId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE queue_leases
      SET status = 'RELEASED',
          released_at = ?,
          updated_at = ?
      WHERE lease_id = ?
        AND worker_id = ?
        AND status = 'ACTIVE'
    `).run(now, now, leaseId, workerId);
        // Clear queue_item lease metadata
        db.prepare(`
      UPDATE queue_items
      SET scheduler_lease_id = NULL,
          scheduler_lease_expires_at = NULL,
          updated_at = ?
      WHERE scheduler_lease_id = ?
    `).run(now, leaseId);
    }
    /**
     * Detect expired leases (for recovery)
     */
    async findExpiredLeases() {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const rows = db.prepare(`
      SELECT * FROM queue_leases
      WHERE status = 'ACTIVE' AND expires_at < ?
      ORDER BY expires_at ASC
    `).all(now);
        return rows.map((row) => this.rowToLease(row));
    }
    /**
     * Mark lease as expired (recovery action)
     */
    async expireLease(leaseId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE queue_leases
      SET status = 'EXPIRED', updated_at = ?
      WHERE lease_id = ? AND status = 'ACTIVE'
    `).run(now, leaseId);
        // Clear queue_item lease metadata
        db.prepare(`
      UPDATE queue_items
      SET scheduler_lease_id = NULL,
          scheduler_lease_expires_at = NULL,
          updated_at = ?
      WHERE scheduler_lease_id = ?
    `).run(now, leaseId);
    }
    /**
     * Get active lease for queue item
     */
    async getActiveLease(queueItemId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const row = db.prepare(`
      SELECT * FROM queue_leases
      WHERE queue_item_id = ? AND status = 'ACTIVE'
      LIMIT 1
    `).get(queueItemId);
        return row ? this.rowToLease(row) : null;
    }
    /**
     * List leases by worker
     */
    async getWorkerLeases(workerId, status) {
        await this.initialize();
        const db = this.stateGraph.db;
        const query = status
            ? `SELECT * FROM queue_leases WHERE worker_id = ? AND status = ? ORDER BY acquired_at DESC`
            : `SELECT * FROM queue_leases WHERE worker_id = ? ORDER BY acquired_at DESC`;
        const rows = status
            ? db.prepare(query).all(workerId, status)
            : db.prepare(query).all(workerId);
        return rows.map((row) => this.rowToLease(row));
    }
    rowToLease(row) {
        return {
            lease_id: row.lease_id,
            queue_item_id: row.queue_item_id,
            worker_id: row.worker_id,
            status: row.status,
            acquired_at: row.acquired_at,
            heartbeat_at: row.heartbeat_at,
            expires_at: row.expires_at,
            released_at: row.released_at || undefined,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
        };
    }
}
//# sourceMappingURL=lease-manager.js.map