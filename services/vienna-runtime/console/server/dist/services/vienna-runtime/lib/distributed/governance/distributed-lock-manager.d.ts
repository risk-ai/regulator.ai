export = DistributedLockManager;
declare class DistributedLockManager {
    constructor(stateGraph: any);
    stateGraph: any;
    lockTimeout: number;
    /**
     * Acquire lock with conflict detection
     */
    acquireLock(lockRequest: any): Promise<{
        lock_id: string;
        acquired: boolean;
        expires_at: string;
    }>;
    /**
     * Release lock
     */
    releaseLock(lockId: any): Promise<{
        released: boolean;
    }>;
    /**
     * Extend lock expiry
     */
    extendLock(lockId: any, additionalTime: any): Promise<{
        extended: boolean;
        expires_at: string;
    }>;
    /**
     * Get lock
     */
    getLock(lockId: any): Promise<{
        lock_id: any;
        target_type: any;
        target_id: any;
        locked_by_node_id: any;
        locked_by_execution_id: any;
        acquired_at: any;
        expires_at: any;
        status: any;
    }>;
    /**
     * Cleanup expired locks
     */
    cleanupExpiredLocks(): Promise<any>;
    /**
     * Force release locks for node (for node failure)
     */
    forceReleaseLocksForNode(nodeId: any): Promise<{
        force_released: boolean;
    }>;
    /**
     * List active locks
     */
    listActiveLocks(filters?: {}): Promise<any>;
    _findActiveLock(targetType: any, targetId: any): Promise<{
        lock_id: any;
        target_type: any;
        target_id: any;
        locked_by_node_id: any;
        locked_by_execution_id: any;
        acquired_at: any;
        expires_at: any;
        status: any;
    }>;
    _deserializeLock(row: any): {
        lock_id: any;
        target_type: any;
        target_id: any;
        locked_by_node_id: any;
        locked_by_execution_id: any;
        acquired_at: any;
        expires_at: any;
        status: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=distributed-lock-manager.d.ts.map