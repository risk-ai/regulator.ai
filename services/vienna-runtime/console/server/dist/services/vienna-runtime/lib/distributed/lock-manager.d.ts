export = LockManager;
declare class LockManager {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Acquire lock
     */
    acquireLock(lockRequest: any): Promise<string>;
    /**
     * Release lock
     */
    releaseLock(lockId: any): Promise<void>;
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
     * Check lock expiry and cleanup
     */
    cleanupExpiredLocks(): Promise<any>;
    /**
     * List locks by node
     */
    listLocksByNode(nodeId: any): Promise<any>;
    /**
     * Release all locks for node
     */
    releaseAllLocksForNode(nodeId: any): Promise<void>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=lock-manager.d.ts.map