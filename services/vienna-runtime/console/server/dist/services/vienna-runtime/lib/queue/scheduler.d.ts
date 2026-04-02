/**
 * Phase 16.3 — Queue Scheduler
 * Phase 16.4 Stage 1 — Lease-aware scheduler with worker registry
 *
 * Deterministic scheduler loop for queued work resumption.
 * Single-process scheduler with multi-worker-safe primitives.
 */
import { GovernanceReentryRequest, GovernanceReentryResult } from "./types";
import { EligibilityDependencies } from "./eligibility";
export interface SchedulerDependencies extends EligibilityDependencies {
    executeGovernanceReentry: (request: GovernanceReentryRequest) => Promise<GovernanceReentryResult>;
}
export declare class QueueScheduler {
    private repository;
    private workerRegistry;
    private leaseManager;
    private claimManager;
    private running;
    private intervalMs;
    private intervalHandle?;
    private workerId;
    private leaseTtlMs;
    constructor(intervalMs?: number, workerId?: string);
    start(deps: SchedulerDependencies): Promise<void>;
    stop(): Promise<void>;
    runSchedulerCycle(deps: SchedulerDependencies): Promise<void>;
    private processQueueItem;
}
//# sourceMappingURL=scheduler.d.ts.map