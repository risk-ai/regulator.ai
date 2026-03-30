/**
 * In-Memory Distributed Lock Manager
 *
 * Lightweight implementation for testing and single-node deployments
 * Phase 20 — Distributed Governance
 */
const crypto = require('crypto');
class DistributedLockManager {
    constructor(lockStore) {
        this.lockStore = lockStore || this._createInMemoryStore();
        this.acquisitionStats = { total: 0, successful: 0 };
    }
    _createInMemoryStore() {
        const locks = new Map();
        const queues = new Map();
        return {
            tryAcquire: async (lockRequest) => {
                const key = lockRequest.resource_id;
                const existingLock = locks.get(key);
                if (existingLock && existingLock.held_by !== lockRequest.holder_id) {
                    return {
                        acquired: false,
                        held_by: existingLock.held_by,
                        reason: 'Lock already held'
                    };
                }
                const lockId = `lock_${crypto.randomBytes(8).toString('hex')}`;
                const now = new Date().toISOString();
                const expiresAt = new Date(Date.now() + (lockRequest.timeout_ms || 60000)).toISOString();
                locks.set(key, {
                    lock_id: lockId,
                    resource_id: key,
                    scope: lockRequest.scope,
                    held_by: lockRequest.holder_id,
                    acquired_at: now,
                    expires_at: expiresAt
                });
                return {
                    acquired: true,
                    lock_id: lockId,
                    expires_at: expiresAt
                };
            },
            release: async (lockId) => {
                for (const [key, lock] of locks.entries()) {
                    if (lock.lock_id === lockId) {
                        locks.delete(key);
                        return {
                            released: true,
                            released_at: new Date().toISOString()
                        };
                    }
                }
                return { released: false, reason: 'Lock not found' };
            },
            getLock: async (lockId) => {
                for (const lock of locks.values()) {
                    if (lock.lock_id === lockId) {
                        return lock;
                    }
                }
                return null;
            },
            listLocks: async (filters = {}) => {
                let result = Array.from(locks.values());
                if (filters.held_by) {
                    result = result.filter(l => l.held_by === filters.held_by);
                }
                return result;
            },
            _locks: locks,
            _queues: queues
        };
    }
    async acquireLock(lockRequest) {
        this.acquisitionStats.total++;
        const result = await this.lockStore.tryAcquire(lockRequest);
        if (result.acquired) {
            this.acquisitionStats.successful++;
        }
        return result;
    }
    async releaseLock(lockId, options = {}) {
        // Check holder if specified
        if (options.holder_id) {
            const lock = await this.lockStore.getLock(lockId);
            if (lock && lock.held_by !== options.holder_id) {
                return {
                    released: false,
                    reason: `Lock not held by ${options.holder_id}`
                };
            }
        }
        const result = await this.lockStore.release(lockId);
        // Grant to next in queue if any
        if (result.released) {
            const queues = this.lockStore._queues;
            for (const [resourceId, queue] of queues.entries()) {
                if (queue.length > 0) {
                    const next = queue.shift();
                    result.next_holder = next.holder_id;
                    break;
                }
            }
        }
        return result;
    }
    async cleanupExpiredLocks() {
        const locks = await this.lockStore.listLocks();
        const now = Date.now();
        let releasedCount = 0;
        for (const lock of locks) {
            if (new Date(lock.expires_at).getTime() < now) {
                await this.lockStore.release(lock.lock_id);
                releasedCount++;
            }
        }
        return { released_count: releasedCount };
    }
    async acquireLockWithQueue(lockRequest) {
        const result = await this.acquireLock(lockRequest);
        if (!result.acquired) {
            const queueEntry = this._addToQueue(lockRequest);
            return {
                queued: true,
                queue_position: queueEntry.position
            };
        }
        return result;
    }
    _addToQueue(lockRequest) {
        const queues = this.lockStore._queues;
        const key = lockRequest.resource_id;
        if (!queues.has(key)) {
            queues.set(key, []);
        }
        const queue = queues.get(key);
        const entry = {
            ...lockRequest,
            queued_at: lockRequest.queued_at || new Date().toISOString(),
            position: queue.length + 1
        };
        queue.push(entry);
        return entry;
    }
    getQueueStatus(resourceId) {
        const queues = this.lockStore._queues;
        const queue = queues.get(resourceId) || [];
        return {
            positions: queue.map(e => e.holder_id)
        };
    }
    async cleanupTimedOutQueueEntries() {
        const queues = this.lockStore._queues;
        for (const [resourceId, queue] of queues.entries()) {
            const filtered = queue.filter(entry => {
                if (!entry.timeout_ms)
                    return true;
                const age = Date.now() - new Date(entry.queued_at).getTime();
                return age <= entry.timeout_ms;
            });
            queues.set(resourceId, filtered);
        }
    }
    async estimateWaitTime(resourceId, holderId) {
        const queue = this.lockStore._queues.get(resourceId) || [];
        const position = queue.findIndex(e => e.holder_id === holderId);
        if (position === -1) {
            return { estimated_wait_ms: 0 };
        }
        const lock = await this.lockStore.getLock(resourceId);
        const avgHoldDuration = lock?.avg_hold_duration_ms || 5000;
        return {
            estimated_wait_ms: avgHoldDuration * (position + 1)
        };
    }
    async detectDeadlocks() {
        // Simple circular dependency detection
        const locks = await this.lockStore.listLocks();
        const queues = this.lockStore._queues;
        const deadlocks = [];
        const waitGraph = new Map(); // node -> waiting_for
        for (const [resourceId, queue] of queues.entries()) {
            for (const entry of queue) {
                const lock = locks.find(l => l.resource_id === resourceId);
                if (lock) {
                    waitGraph.set(entry.holder_id, lock.held_by);
                }
            }
        }
        // Detect cycles
        for (const [node, _] of waitGraph.entries()) {
            const visited = new Set();
            let current = node;
            while (current) {
                if (visited.has(current)) {
                    // Cycle detected
                    deadlocks.push({
                        type: 'circular_dependency',
                        nodes: Array.from(visited)
                    });
                    break;
                }
                visited.add(current);
                current = waitGraph.get(current);
            }
        }
        this._logDeadlock(deadlocks);
        return deadlocks;
    }
    _deadlockLog = [];
    _logDeadlock(deadlocks) {
        if (deadlocks.length > 0) {
            this._deadlockLog.push({
                timestamp: new Date().toISOString(),
                count: deadlocks.length,
                deadlocks
            });
        }
    }
    getDeadlockLog() {
        return this._deadlockLog;
    }
    async resolveDeadlock(deadlockId) {
        // Simple resolution: abort lowest priority holder
        const deadlocks = await this.detectDeadlocks();
        const deadlock = deadlocks[0]; // Simplified
        if (!deadlock) {
            return { resolved: false };
        }
        // Find highest priority value (lower priority) in queue
        const queues = this.lockStore._queues;
        let highestPriority = -Infinity;
        let lowestHolder = null;
        for (const queue of queues.values()) {
            for (const entry of queue) {
                const priority = entry.priority || 100;
                if (priority > highestPriority) {
                    highestPriority = priority;
                    lowestHolder = entry.holder_id;
                }
            }
        }
        return {
            resolved: true,
            aborted_holder: lowestHolder
        };
    }
    async acquireMultipleLocks(request) {
        const { resource_ids, holder_id, enforceOrdering } = request;
        const ids = enforceOrdering
            ? resource_ids.sort()
            : resource_ids;
        const acquired = [];
        for (const resourceId of ids) {
            const result = await this.acquireLock({
                resource_id: resourceId,
                holder_id,
                scope: 'target'
            });
            if (!result.acquired) {
                // Release all acquired locks
                for (const lockId of acquired) {
                    await this.releaseLock(lockId);
                }
                return { acquired: false, failed_at: resourceId };
            }
            acquired.push(result.lock_id);
        }
        return { acquired: true, lock_ids: acquired };
    }
    async listActiveLocks(filters = {}) {
        return await this.lockStore.listLocks(filters);
    }
    async findLongHeldLocks(options = {}) {
        const thresholdMs = options.thresholdMs || 120000;
        const locks = await this.lockStore.listLocks();
        const now = Date.now();
        return locks
            .map(lock => ({
            ...lock,
            hold_duration_ms: now - new Date(lock.acquired_at).getTime()
        }))
            .filter(lock => lock.hold_duration_ms > thresholdMs);
    }
    async getLockStatistics() {
        const locks = await this.lockStore.listLocks();
        const waitCounts = locks.map(l => l.wait_count || 0);
        const avgWaitCount = waitCounts.length > 0
            ? waitCounts.reduce((a, b) => a + b, 0) / waitCounts.length
            : 0;
        const mostContended = locks.reduce((max, lock) => {
            return (lock.wait_count || 0) > (max?.wait_count || 0) ? lock : max;
        }, null);
        return {
            total_active_locks: locks.length,
            most_contended: mostContended?.resource_id,
            avg_wait_count: avgWaitCount
        };
    }
    getAcquisitionStats() {
        return {
            total_attempts: this.acquisitionStats.total,
            successful: this.acquisitionStats.successful,
            success_rate: this.acquisitionStats.total > 0
                ? this.acquisitionStats.successful / this.acquisitionStats.total
                : 0
        };
    }
}
module.exports = DistributedLockManager;
//# sourceMappingURL=distributed-lock-manager-memory.js.map