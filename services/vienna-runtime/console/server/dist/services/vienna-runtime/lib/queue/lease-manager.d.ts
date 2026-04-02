/**
 * Phase 16.4 Stage 1 — Lease Manager
 *
 * Atomic lease acquisition, heartbeat, renewal, expiry detection.
 * Single-process scheduler with multi-worker-safe primitives.
 */
export type LeaseStatus = "ACTIVE" | "EXPIRED" | "RELEASED";
export type QueueLease = {
    lease_id: string;
    queue_item_id: string;
    worker_id: string;
    status: LeaseStatus;
    acquired_at: string;
    heartbeat_at: string;
    expires_at: string;
    released_at?: string;
    metadata?: Record<string, unknown>;
};
export type LeaseAcquisitionResult = {
    acquired: true;
    lease: QueueLease;
} | {
    acquired: false;
    reason: string;
    conflicting_lease_id?: string;
};
export type LeaseRenewalResult = {
    renewed: true;
    new_expires_at: string;
} | {
    renewed: false;
    reason: string;
};
export declare class LeaseManager {
    private stateGraph;
    private defaultTtlMs;
    private heartbeatIntervalMs;
    initialize(): Promise<void>;
    /**
     * Acquire exclusive lease on queue item (atomic CAS)
     *
     * Only succeeds if no active lease exists.
     */
    acquireLease(queueItemId: string, workerId: string, ttlMs?: number): Promise<LeaseAcquisitionResult>;
    /**
     * Renew lease (heartbeat + extend expiry)
     */
    renewLease(leaseId: string, workerId: string, ttlMs?: number): Promise<LeaseRenewalResult>;
    /**
     * Release lease (normal completion)
     */
    releaseLease(leaseId: string, workerId: string): Promise<void>;
    /**
     * Detect expired leases (for recovery)
     */
    findExpiredLeases(): Promise<QueueLease[]>;
    /**
     * Mark lease as expired (recovery action)
     */
    expireLease(leaseId: string): Promise<void>;
    /**
     * Get active lease for queue item
     */
    getActiveLease(queueItemId: string): Promise<QueueLease | null>;
    /**
     * List leases by worker
     */
    getWorkerLeases(workerId: string, status?: LeaseStatus): Promise<QueueLease[]>;
    private rowToLease;
}
//# sourceMappingURL=lease-manager.d.ts.map