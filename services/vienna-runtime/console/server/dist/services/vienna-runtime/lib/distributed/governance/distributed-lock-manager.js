/**
 * Distributed Lock Manager
 *
 * Centralized lock management for distributed governance
 * Phase 20 — Distributed Governance
 */
const crypto = require('crypto');
class DistributedLockManager {
    constructor(stateGraph) {
        this.stateGraph = stateGraph;
        this.lockTimeout = 300000; // 5 minutes default
    }
    /**
     * Acquire lock with conflict detection
     */
    async acquireLock(lockRequest) {
        const { target_type, target_id, locked_by_node_id, locked_by_execution_id, timeout } = lockRequest;
        // Check for existing lock
        const existing = await this._findActiveLock(target_type, target_id);
        if (existing) {
            throw {
                code: 'LOCK_CONFLICT',
                message: `Target locked by ${existing.locked_by_node_id}`,
                locked_by_node_id: existing.locked_by_node_id,
                locked_by_execution_id: existing.locked_by_execution_id
            };
        }
        const lockId = this._generateId('lock');
        const expiresAt = new Date(Date.now() + (timeout || this.lockTimeout)).toISOString();
        await this.stateGraph.run(`INSERT INTO distributed_locks (
        lock_id, target_type, target_id, locked_by_node_id,
        locked_by_execution_id, acquired_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            lockId,
            target_type,
            target_id,
            locked_by_node_id,
            locked_by_execution_id,
            new Date().toISOString(),
            expiresAt,
            'active'
        ]);
        return {
            lock_id: lockId,
            acquired: true,
            expires_at: expiresAt
        };
    }
    /**
     * Release lock
     */
    async releaseLock(lockId) {
        await this.stateGraph.run(`UPDATE distributed_locks 
       SET status = 'released' 
       WHERE lock_id = ? AND status = 'active'`, [lockId]);
        return { released: true };
    }
    /**
     * Extend lock expiry
     */
    async extendLock(lockId, additionalTime) {
        const lock = await this.getLock(lockId);
        if (!lock || lock.status !== 'active') {
            throw new Error('Lock not active');
        }
        const newExpiresAt = new Date(new Date(lock.expires_at).getTime() + additionalTime).toISOString();
        await this.stateGraph.run(`UPDATE distributed_locks 
       SET expires_at = ? 
       WHERE lock_id = ?`, [newExpiresAt, lockId]);
        return { extended: true, expires_at: newExpiresAt };
    }
    /**
     * Get lock
     */
    async getLock(lockId) {
        const row = await this.stateGraph.get(`SELECT * FROM distributed_locks WHERE lock_id = ?`, [lockId]);
        if (!row)
            return null;
        return this._deserializeLock(row);
    }
    /**
     * Cleanup expired locks
     */
    async cleanupExpiredLocks() {
        const now = new Date().toISOString();
        const expired = await this.stateGraph.all(`SELECT * FROM distributed_locks 
       WHERE status = 'active' AND expires_at < ?`, [now]);
        for (const lock of expired) {
            await this.stateGraph.run(`UPDATE distributed_locks 
         SET status = 'expired' 
         WHERE lock_id = ?`, [lock.lock_id]);
        }
        return expired.map(l => ({
            lock_id: l.lock_id,
            locked_by_node_id: l.locked_by_node_id,
            held_duration_ms: new Date(now).getTime() - new Date(l.acquired_at).getTime()
        }));
    }
    /**
     * Force release locks for node (for node failure)
     */
    async forceReleaseLocksForNode(nodeId) {
        await this.stateGraph.run(`UPDATE distributed_locks 
       SET status = 'released' 
       WHERE locked_by_node_id = ? AND status = 'active'`, [nodeId]);
        return { force_released: true };
    }
    /**
     * List active locks
     */
    async listActiveLocks(filters = {}) {
        let query = 'SELECT * FROM distributed_locks WHERE status = ?';
        const params = ['active'];
        if (filters.locked_by_node_id) {
            query += ' AND locked_by_node_id = ?';
            params.push(filters.locked_by_node_id);
        }
        if (filters.target_type) {
            query += ' AND target_type = ?';
            params.push(filters.target_type);
        }
        const rows = await this.stateGraph.all(query, params);
        return rows.map(r => this._deserializeLock(r));
    }
    // Helper methods
    async _findActiveLock(targetType, targetId) {
        const row = await this.stateGraph.get(`SELECT * FROM distributed_locks 
       WHERE target_type = ? AND target_id = ? AND status = 'active'`, [targetType, targetId]);
        return row ? this._deserializeLock(row) : null;
    }
    _deserializeLock(row) {
        return {
            lock_id: row.lock_id,
            target_type: row.target_type,
            target_id: row.target_id,
            locked_by_node_id: row.locked_by_node_id,
            locked_by_execution_id: row.locked_by_execution_id,
            acquired_at: row.acquired_at,
            expires_at: row.expires_at,
            status: row.status
        };
    }
    _generateId(prefix) {
        return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
    }
}
module.exports = DistributedLockManager;
//# sourceMappingURL=distributed-lock-manager.js.map