/**
 * Phase 16.4 Stage 1 — Scheduler Worker Registry
 *
 * Track active scheduler processes with heartbeat monitoring.
 */
export type WorkerStatus = "ACTIVE" | "INACTIVE";
export type SchedulerWorker = {
    worker_id: string;
    status: WorkerStatus;
    started_at: string;
    heartbeat_at: string;
    version?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};
export declare class WorkerRegistry {
    private stateGraph;
    private heartbeatIntervalMs;
    private heartbeatHandle?;
    initialize(): Promise<void>;
    /**
     * Register new worker (start of scheduler process)
     */
    registerWorker(workerId: string, version?: string, metadata?: Record<string, unknown>): Promise<SchedulerWorker>;
    /**
     * Heartbeat (periodic liveness signal)
     */
    heartbeat(workerId: string): Promise<void>;
    /**
     * Deactivate worker (normal shutdown)
     */
    deactivateWorker(workerId: string): Promise<void>;
    /**
     * Get worker by ID
     */
    getWorker(workerId: string): Promise<SchedulerWorker | null>;
    /**
     * List workers by status
     */
    listWorkers(status?: WorkerStatus): Promise<SchedulerWorker[]>;
    /**
     * Find stale workers (no heartbeat beyond threshold)
     */
    findStaleWorkers(staleThresholdMs?: number): Promise<SchedulerWorker[]>;
    /**
     * Start automatic heartbeat (background process)
     */
    startHeartbeat(workerId: string, intervalMs?: number): void;
    /**
     * Stop automatic heartbeat
     */
    stopHeartbeat(): void;
    private rowToWorker;
}
//# sourceMappingURL=worker-registry.d.ts.map