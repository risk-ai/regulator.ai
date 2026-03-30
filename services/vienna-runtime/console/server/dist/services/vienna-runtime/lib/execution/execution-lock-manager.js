/**
 * ExecutionLockManager
 *
 * Target-level lock/lease system to prevent concurrent plan execution collisions.
 *
 * Core guarantees:
 * - No two plans can concurrently modify the same target
 * - Locks are time-bounded (default TTL: 5 minutes)
 * - Lock conflicts are visible in audit trail
 * - Expired locks are automatically cleaned up
 *
 * Architecture:
 * - Exclusive locks (one owner per target)
 * - Reentrant (same execution can re-acquire)
 * - Deterministic (lock request denied if target locked)
 * - Fail-safe (deny on conflict, expire on timeout)
 */
const crypto = require('crypto');
const { getStateGraph } = require('../state/state-graph');
class ExecutionLockManager {
    constructor() {
        this.stateGraph = getStateGraph();
    }
    /**
     * Acquire lock on target
     *
     * @param {Object} params
     * @param {string} params.target_type - 'service', 'endpoint', 'provider', 'resource'
     * @param {string} params.target_id - Target identifier
     * @param {string} params.execution_id - Owner execution ID
     * @param {string} [params.plan_id] - Associated plan
     * @param {string} [params.objective_id] - Associated objective
     * @param {number} [params.ttl_seconds=300] - Lock TTL (default 5 minutes)
     * @returns {Promise<Object>} { success, lock_id?, reason?, locked_by?, expires_at? }
     */
    async acquireLock({ target_type, target_id, execution_id, plan_id, objective_id, ttl_seconds = 300 }) {
        // Validate inputs
        if (!target_type || !target_id || !execution_id) {
            throw new Error('INVALID_LOCK_REQUEST: target_type, target_id, and execution_id required');
        }
        const validTargetTypes = ['service', 'endpoint', 'provider', 'resource'];
        if (!validTargetTypes.includes(target_type)) {
            throw new Error(`INVALID_TARGET_TYPE: must be one of ${validTargetTypes.join(', ')}`);
        }
        // Clean up expired locks first (to handle unique constraint)
        await this.expireStaleLocks();
        // Check for existing active lock
        const existingLock = await this.getActiveLock({ target_type, target_id });
        if (existingLock) {
            // Deny if different execution owns lock
            if (existingLock.execution_id !== execution_id) {
                return {
                    success: false,
                    reason: 'TARGET_LOCKED',
                    locked_by: existingLock.execution_id,
                    expires_at: existingLock.expires_at,
                    lock_id: existingLock.lock_id
                };
            }
            // Allow if same execution (reentrant)
            return {
                success: true,
                lock_id: existingLock.lock_id,
                reentrant: true,
                acquired_at: existingLock.acquired_at,
                expires_at: existingLock.expires_at
            };
        }
        // Acquire new lock
        const lock_id = `lock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const acquired_at = Math.floor(Date.now() / 1000);
        const expires_at = acquired_at + ttl_seconds;
        this.stateGraph.db.prepare(`
      INSERT INTO execution_locks 
      (lock_id, target_type, target_id, execution_id, plan_id, objective_id, acquired_at, expires_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(lock_id, target_type, target_id, execution_id, plan_id, objective_id, acquired_at, expires_at);
        return {
            success: true,
            lock_id,
            acquired_at,
            expires_at
        };
    }
    /**
     * Release lock
     *
     * @param {Object} params
     * @param {string} params.lock_id - Lock to release
     * @param {string} params.execution_id - Owner execution ID
     * @returns {Promise<Object>} { success, reason? }
     */
    async releaseLock({ lock_id, execution_id }) {
        if (!lock_id || !execution_id) {
            throw new Error('INVALID_RELEASE_REQUEST: lock_id and execution_id required');
        }
        // Get lock
        const lock = await this.stateGraph.query(`
      SELECT * FROM execution_locks WHERE lock_id = ?
    `, [lock_id]);
        if (lock.length === 0) {
            // Idempotent: already released or never existed
            return { success: true, reason: 'ALREADY_RELEASED' };
        }
        const lockRecord = lock[0];
        // Verify ownership
        if (lockRecord.execution_id !== execution_id) {
            return {
                success: false,
                reason: 'NOT_OWNER',
                owner: lockRecord.execution_id
            };
        }
        // Idempotent: already released
        if (lockRecord.status === 'released') {
            return { success: true, reason: 'ALREADY_RELEASED' };
        }
        // Release lock
        const released_at = Math.floor(Date.now() / 1000);
        this.stateGraph.db.prepare(`
      UPDATE execution_locks 
      SET status = 'released', released_at = ?
      WHERE lock_id = ?
    `).run(released_at, lock_id);
        return {
            success: true,
            released_at,
            duration_seconds: released_at - lockRecord.acquired_at
        };
    }
    /**
     * Check if target is locked
     *
     * @param {Object} params
     * @param {string} params.target_type
     * @param {string} params.target_id
     * @returns {Promise<boolean>}
     */
    async isLocked({ target_type, target_id }) {
        const lock = await this.getActiveLock({ target_type, target_id });
        return lock !== null;
    }
    /**
     * Get active lock for target
     *
     * @param {Object} params
     * @param {string} params.target_type
     * @param {string} params.target_id
     * @returns {Promise<Object|null>}
     */
    async getActiveLock({ target_type, target_id }) {
        const now = Math.floor(Date.now() / 1000);
        const locks = await this.stateGraph.query(`
      SELECT * FROM execution_locks 
      WHERE target_type = ? 
        AND target_id = ? 
        AND status = 'active'
        AND expires_at > ?
      ORDER BY acquired_at DESC
      LIMIT 1
    `, [target_type, target_id, now]);
        return locks.length > 0 ? locks[0] : null;
    }
    /**
     * List all active locks
     *
     * @returns {Promise<Array>}
     */
    async listActiveLocks() {
        const now = Math.floor(Date.now() / 1000);
        return await this.stateGraph.query(`
      SELECT * FROM execution_locks 
      WHERE status = 'active'
        AND expires_at > ?
      ORDER BY acquired_at DESC
    `, [now]);
    }
    /**
     * Expire stale locks (cleanup service)
     *
     * Marks expired locks as 'expired' for audit trail.
     * Should be run periodically (e.g., every 60 seconds).
     *
     * @returns {Promise<Object>} { expired_count, expired_locks }
     */
    async expireStaleLocks() {
        const now = Math.floor(Date.now() / 1000);
        // Find expired locks
        const expiredLocks = await this.stateGraph.query(`
      SELECT * FROM execution_locks 
      WHERE status = 'active'
        AND expires_at <= ?
    `, [now]);
        if (expiredLocks.length === 0) {
            return { expired_count: 0, expired_locks: [] };
        }
        // Mark as expired
        for (const lock of expiredLocks) {
            this.stateGraph.db.prepare(`
        UPDATE execution_locks 
        SET status = 'expired', released_at = ?
        WHERE lock_id = ?
      `).run(now, lock.lock_id);
        }
        return {
            expired_count: expiredLocks.length,
            expired_locks: expiredLocks.map(l => ({
                lock_id: l.lock_id,
                target_type: l.target_type,
                target_id: l.target_id,
                execution_id: l.execution_id,
                acquired_at: l.acquired_at,
                expires_at: l.expires_at
            }))
        };
    }
    /**
     * Extend lock TTL (heartbeat)
     *
     * Used by long-running plans to prevent expiration.
     *
     * @param {Object} params
     * @param {string} params.lock_id
     * @param {string} params.execution_id - Owner execution ID
     * @param {number} [params.extension_seconds=60] - TTL extension
     * @returns {Promise<Object>} { success, new_expires_at?, reason? }
     */
    async extendLock({ lock_id, execution_id, extension_seconds = 60 }) {
        if (!lock_id || !execution_id) {
            throw new Error('INVALID_EXTEND_REQUEST: lock_id and execution_id required');
        }
        // Get lock
        const locks = await this.stateGraph.query(`
      SELECT * FROM execution_locks WHERE lock_id = ?
    `, [lock_id]);
        if (locks.length === 0) {
            return {
                success: false,
                reason: 'LOCK_NOT_FOUND'
            };
        }
        const lock = locks[0];
        // Verify ownership
        if (lock.execution_id !== execution_id) {
            return {
                success: false,
                reason: 'NOT_OWNER',
                owner: lock.execution_id
            };
        }
        // Verify active
        if (lock.status !== 'active') {
            return {
                success: false,
                reason: 'LOCK_NOT_ACTIVE',
                status: lock.status
            };
        }
        // Extend TTL
        const new_expires_at = lock.expires_at + extension_seconds;
        this.stateGraph.db.prepare(`
      UPDATE execution_locks 
      SET expires_at = ?
      WHERE lock_id = ?
    `).run(new_expires_at, lock_id);
        return {
            success: true,
            new_expires_at,
            extension_seconds
        };
    }
    /**
     * Get lock statistics
     *
     * @returns {Promise<Object>}
     */
    async getStatistics() {
        const active = await this.stateGraph.query(`
      SELECT COUNT(*) as count FROM execution_locks WHERE status = 'active'
    `);
        const released = await this.stateGraph.query(`
      SELECT COUNT(*) as count FROM execution_locks WHERE status = 'released'
    `);
        const expired = await this.stateGraph.query(`
      SELECT COUNT(*) as count FROM execution_locks WHERE status = 'expired'
    `);
        const byTarget = await this.stateGraph.query(`
      SELECT target_type, COUNT(*) as count 
      FROM execution_locks 
      WHERE status = 'active'
      GROUP BY target_type
    `);
        return {
            active: active[0].count,
            released: released[0].count,
            expired: expired[0].count,
            by_target: byTarget.reduce((acc, row) => {
                acc[row.target_type] = row.count;
                return acc;
            }, {})
        };
    }
}
module.exports = { ExecutionLockManager };
//# sourceMappingURL=execution-lock-manager.js.map