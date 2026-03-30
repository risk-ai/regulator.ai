export class ExecutionLockManager {
    stateGraph: any;
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
    acquireLock({ target_type, target_id, execution_id, plan_id, objective_id, ttl_seconds }: {
        target_type: string;
        target_id: string;
        execution_id: string;
        plan_id?: string;
        objective_id?: string;
        ttl_seconds?: number;
    }): Promise<any>;
    /**
     * Release lock
     *
     * @param {Object} params
     * @param {string} params.lock_id - Lock to release
     * @param {string} params.execution_id - Owner execution ID
     * @returns {Promise<Object>} { success, reason? }
     */
    releaseLock({ lock_id, execution_id }: {
        lock_id: string;
        execution_id: string;
    }): Promise<any>;
    /**
     * Check if target is locked
     *
     * @param {Object} params
     * @param {string} params.target_type
     * @param {string} params.target_id
     * @returns {Promise<boolean>}
     */
    isLocked({ target_type, target_id }: {
        target_type: string;
        target_id: string;
    }): Promise<boolean>;
    /**
     * Get active lock for target
     *
     * @param {Object} params
     * @param {string} params.target_type
     * @param {string} params.target_id
     * @returns {Promise<Object|null>}
     */
    getActiveLock({ target_type, target_id }: {
        target_type: string;
        target_id: string;
    }): Promise<any | null>;
    /**
     * List all active locks
     *
     * @returns {Promise<Array>}
     */
    listActiveLocks(): Promise<any[]>;
    /**
     * Expire stale locks (cleanup service)
     *
     * Marks expired locks as 'expired' for audit trail.
     * Should be run periodically (e.g., every 60 seconds).
     *
     * @returns {Promise<Object>} { expired_count, expired_locks }
     */
    expireStaleLocks(): Promise<any>;
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
    extendLock({ lock_id, execution_id, extension_seconds }: {
        lock_id: string;
        execution_id: string;
        extension_seconds?: number;
    }): Promise<any>;
    /**
     * Get lock statistics
     *
     * @returns {Promise<Object>}
     */
    getStatistics(): Promise<any>;
}
//# sourceMappingURL=execution-lock-manager.d.ts.map