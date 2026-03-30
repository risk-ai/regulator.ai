/**
 * Phase 16.4 Stage 1 — Lease Expiry Detector
 * Phase 16.4 Stage 2 — Extended with abandoned claim detection
 *
 * Background service to detect and mark expired leases and abandoned claims.
 * Enables recovery from crashed/stalled schedulers.
 */
export declare class ExpiryDetector {
    private leaseManager;
    private workerRegistry;
    private claimManager;
    private running;
    private intervalMs;
    private intervalHandle?;
    private staleWorkerThresholdMs;
    private abandonedClaimThresholdMs;
    constructor(intervalMs?: number);
    start(): Promise<void>;
    stop(): Promise<void>;
    detectExpiredLeases(): Promise<void>;
    /**
     * Manual trigger for testing/debugging
     */
    detectOnce(): Promise<void>;
}
//# sourceMappingURL=expiry-detector.d.ts.map