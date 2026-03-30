/**
 * Phase 16.4 Stage 2 — Claim Manager
 *
 * Exactly-once orchestration semantics via atomic claim creation.
 * Guarantees: No duplicate execution for same attempt number.
 */
export type ClaimStatus = "CLAIMED" | "STARTED" | "COMPLETED" | "FAILED" | "ABANDONED";
export type ExecutionClaim = {
    claim_id: string;
    queue_item_id: string;
    execution_key: string;
    attempt_number: number;
    worker_id: string;
    status: ClaimStatus;
    claimed_at: string;
    started_at?: string;
    completed_at?: string;
    result_summary?: string;
    error_message?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};
export type ClaimAcquisitionResult = {
    claimed: true;
    claim: ExecutionClaim;
} | {
    claimed: false;
    reason: string;
    existing_claim_id?: string;
};
export type ClaimTransitionResult = {
    transitioned: true;
} | {
    transitioned: false;
    reason: string;
};
export declare class ClaimManager {
    private stateGraph;
    initialize(): Promise<void>;
    /**
     * Generate deterministic execution key
     *
     * Formula: SHA-256(queue_item_id:attempt_number)
     */
    generateExecutionKey(queueItemId: string, attemptNumber: number): string;
    /**
     * Acquire execution claim (atomic, exactly-once guarantee)
     *
     * Only succeeds if no claim exists for this queue_item_id + attempt_number.
     */
    acquireClaim(queueItemId: string, attemptNumber: number, workerId: string, metadata?: Record<string, unknown>): Promise<ClaimAcquisitionResult>;
    /**
     * Transition claim to STARTED
     */
    markStarted(claimId: string, workerId: string): Promise<ClaimTransitionResult>;
    /**
     * Transition claim to COMPLETED
     */
    markCompleted(claimId: string, workerId: string, resultSummary?: string): Promise<ClaimTransitionResult>;
    /**
     * Transition claim to FAILED
     */
    markFailed(claimId: string, workerId: string, errorMessage?: string): Promise<ClaimTransitionResult>;
    /**
     * Mark claim as ABANDONED (recovery action)
     */
    markAbandoned(claimId: string, reason?: string): Promise<void>;
    /**
     * Get claim by ID
     */
    getClaim(claimId: string): Promise<ExecutionClaim | null>;
    /**
     * Get claim by execution key (for idempotency check)
     */
    getClaimByExecutionKey(executionKey: string): Promise<ExecutionClaim | null>;
    /**
     * Get active claim for queue item (latest attempt)
     */
    getActiveClaim(queueItemId: string): Promise<ExecutionClaim | null>;
    /**
     * Find abandoned claims (CLAIMED/STARTED beyond threshold)
     */
    findAbandonedClaims(abandonmentThresholdMs?: number): Promise<ExecutionClaim[]>;
    /**
     * List claims by queue item (all attempts)
     */
    listClaimsByQueueItem(queueItemId: string): Promise<ExecutionClaim[]>;
    /**
     * List claims by worker
     */
    listClaimsByWorker(workerId: string, status?: ClaimStatus): Promise<ExecutionClaim[]>;
    private rowToClaim;
}
//# sourceMappingURL=claim-manager.d.ts.map