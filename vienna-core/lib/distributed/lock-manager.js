/**
 * Lock Manager
 * 
 * Centralized distributed lock management
 * Phase 19 — Distributed Execution
 */

const crypto = require('crypto');

class LockManager {
  constructor(stateGraph) {
    this.stateGraph = stateGraph;
  }

  /**
   * Acquire lock
   */
  async acquireLock(lockRequest) {
    const { target_type, target_id, locked_by_node_id, locked_by_execution_id, timeout } = lockRequest;

    // Check if lock already exists
    const existing = await this.stateGraph.get(
      `SELECT * FROM distributed_locks 
       WHERE target_type = ? AND target_id = ? AND status = 'active'`,
      [target_type, target_id]
    );

    if (existing) {
      throw new Error(`Lock held by ${existing.locked_by_node_id} (execution: ${existing.locked_by_execution_id})`);
    }

    const lockId = this._generateId('lock');
    const expiresAt = new Date(Date.now() + (timeout || 300000)).toISOString();

    await this.stateGraph.run(
      `INSERT INTO distributed_locks (
        lock_id, target_type, target_id, locked_by_node_id,
        locked_by_execution_id, acquired_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lockId,
        target_type,
        target_id,
        locked_by_node_id,
        locked_by_execution_id,
        new Date().toISOString(),
        expiresAt,
        'active'
      ]
    );

    return lockId;
  }

  /**
   * Release lock
   */
  async releaseLock(lockId) {
    await this.stateGraph.run(
      `UPDATE distributed_locks SET status = 'released' WHERE lock_id = ?`,
      [lockId]
    );
  }

  /**
   * Get lock
   */
  async getLock(lockId) {
    const row = await this.stateGraph.get(
      `SELECT * FROM distributed_locks WHERE lock_id = ?`,
      [lockId]
    );

    if (!row) return null;

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

  /**
   * Check lock expiry and cleanup
   */
  async cleanupExpiredLocks() {
    const now = new Date().toISOString();

    const expired = await this.stateGraph.all(
      `SELECT * FROM distributed_locks 
       WHERE status = 'active' AND expires_at < ?`,
      [now]
    );

    for (const lock of expired) {
      await this.stateGraph.run(
        `UPDATE distributed_locks SET status = 'expired' WHERE lock_id = ?`,
        [lock.lock_id]
      );
    }

    return expired.map(l => l.lock_id);
  }

  /**
   * List locks by node
   */
  async listLocksByNode(nodeId) {
    const rows = await this.stateGraph.all(
      `SELECT * FROM distributed_locks 
       WHERE locked_by_node_id = ? AND status = 'active'`,
      [nodeId]
    );

    return rows.map(r => ({
      lock_id: r.lock_id,
      target_type: r.target_type,
      target_id: r.target_id,
      acquired_at: r.acquired_at,
      expires_at: r.expires_at
    }));
  }

  /**
   * Release all locks for node
   */
  async releaseAllLocksForNode(nodeId) {
    await this.stateGraph.run(
      `UPDATE distributed_locks 
       SET status = 'released' 
       WHERE locked_by_node_id = ? AND status = 'active'`,
      [nodeId]
    );
  }

  _generateId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = LockManager;
