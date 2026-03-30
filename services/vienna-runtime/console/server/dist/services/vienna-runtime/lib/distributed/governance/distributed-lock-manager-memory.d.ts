export = DistributedLockManager;
declare class DistributedLockManager {
    constructor(lockStore: any);
    lockStore: any;
    acquisitionStats: {
        total: number;
        successful: number;
    };
    _createInMemoryStore(): {
        tryAcquire: (lockRequest: any) => Promise<{
            acquired: boolean;
            held_by: any;
            reason: string;
            lock_id?: undefined;
            expires_at?: undefined;
        } | {
            acquired: boolean;
            lock_id: string;
            expires_at: string;
            held_by?: undefined;
            reason?: undefined;
        }>;
        release: (lockId: any) => Promise<{
            released: boolean;
            released_at: string;
            reason?: undefined;
        } | {
            released: boolean;
            reason: string;
            released_at?: undefined;
        }>;
        getLock: (lockId: any) => Promise<any>;
        listLocks: (filters?: {}) => Promise<any[]>;
        _locks: Map<any, any>;
        _queues: Map<any, any>;
    };
    acquireLock(lockRequest: any): Promise<any>;
    releaseLock(lockId: any, options?: {}): Promise<any>;
    cleanupExpiredLocks(): Promise<{
        released_count: number;
    }>;
    acquireLockWithQueue(lockRequest: any): Promise<any>;
    _addToQueue(lockRequest: any): any;
    getQueueStatus(resourceId: any): {
        positions: any;
    };
    cleanupTimedOutQueueEntries(): Promise<void>;
    estimateWaitTime(resourceId: any, holderId: any): Promise<{
        estimated_wait_ms: number;
    }>;
    detectDeadlocks(): Promise<{
        type: string;
        nodes: any[];
    }[]>;
    _deadlockLog: any[];
    _logDeadlock(deadlocks: any): void;
    getDeadlockLog(): any[];
    resolveDeadlock(deadlockId: any): Promise<{
        resolved: boolean;
        aborted_holder?: undefined;
    } | {
        resolved: boolean;
        aborted_holder: any;
    }>;
    acquireMultipleLocks(request: any): Promise<{
        acquired: boolean;
        failed_at: any;
        lock_ids?: undefined;
    } | {
        acquired: boolean;
        lock_ids: any[];
        failed_at?: undefined;
    }>;
    listActiveLocks(filters?: {}): Promise<any>;
    findLongHeldLocks(options?: {}): Promise<any>;
    getLockStatistics(): Promise<{
        total_active_locks: any;
        most_contended: any;
        avg_wait_count: number;
    }>;
    getAcquisitionStats(): {
        total_attempts: number;
        successful: number;
        success_rate: number;
    };
}
//# sourceMappingURL=distributed-lock-manager-memory.d.ts.map