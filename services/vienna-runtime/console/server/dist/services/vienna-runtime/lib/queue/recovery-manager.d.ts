/**
 * Phase 16.4 Stage 3 — Recovery Manager
 *
 * Safe recovery from stuck/uncertain execution states.
 * Fail-closed policy: when execution certainty is lost, mark FAILED + require operator review.
 */
import { QueueItem } from "./types";
export type RecoveryDisposition = "RECLAIM" | "REQUEUE" | "FAIL_CLOSED" | "CANCEL" | "IGNORE";
export type RecoveryEvent = {
    recovery_id: string;
    queue_item_id: string;
    disposition: RecoveryDisposition;
    detected_at: string;
    resolved_at?: string;
    reason: string;
    metadata?: Record<string, unknown>;
};
export type StuckWorkItem = {
    queue_item: QueueItem;
    stuck_reason: string;
    stuck_since: string;
    lease_expired: boolean;
    claim_abandoned: boolean;
    recommended_disposition: RecoveryDisposition;
};
export declare class RecoveryManager {
    private stateGraph;
    private repository;
    private leaseManager;
    private claimManager;
    private staleRunningThresholdMs;
    private staleTransitionalThresholdMs;
    initialize(): Promise<void>;
    /**
     * Detect stuck work items across all states
     */
    detectStuckWork(): Promise<StuckWorkItem[]>;
    /**
     * Recover stuck work item (execute recommended disposition)
     */
    recoverStuckItem(stuckItem: StuckWorkItem): Promise<RecoveryEvent>;
    /**
     * Reclaim item (safe to retry)
     */
    private reclaimItem;
    /**
     * Requeue item (retry with new attempt)
     */
    private requeueItem;
    /**
     * Fail-closed item (uncertain execution)
     */
    private failClosedItem;
    /**
     * Cancel item (superseded or invalid)
     */
    private cancelItem;
    /**
     * Determine stuck reason
     */
    private determineStuckReason;
    /**
     * Determine recovery disposition (fail-closed by default)
     */
    private determineRecoveryDisposition;
    /**
     * Emit recovery event to audit trail
     */
    private emitRecoveryEvent;
    /**
     * List recovery events by queue item
     */
    listRecoveryEvents(queueItemId?: string): Promise<RecoveryEvent[]>;
}
//# sourceMappingURL=recovery-manager.d.ts.map