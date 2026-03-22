/**
 * Phase 16.4 Stage 1 — Lease Expiry Detector
 * Phase 16.4 Stage 2 — Extended with abandoned claim detection
 * 
 * Background service to detect and mark expired leases and abandoned claims.
 * Enables recovery from crashed/stalled schedulers.
 */

import { LeaseManager } from "./lease-manager";
import { WorkerRegistry } from "./worker-registry";
import { ClaimManager } from "./claim-manager";

export class ExpiryDetector {
  private leaseManager = new LeaseManager();
  private workerRegistry = new WorkerRegistry();
  private claimManager = new ClaimManager();
  private running = false;
  private intervalMs: number;
  private intervalHandle?: NodeJS.Timeout;
  private staleWorkerThresholdMs = 60000; // 60 seconds
  private abandonedClaimThresholdMs = 300000; // 5 minutes

  constructor(intervalMs: number = 15000) {
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error("Expiry detector already running");
    }

    this.running = true;
    this.intervalHandle = setInterval(() => {
      this.detectExpiredLeases().catch((err) => {
        console.error("Expiry detection cycle error:", err);
      });
    }, this.intervalMs);

    console.log(`Lease expiry detector started (interval: ${this.intervalMs}ms)`);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }

    console.log("Lease expiry detector stopped");
  }

  async detectExpiredLeases(): Promise<void> {
    try {
      // Find expired leases
      const expiredLeases = await this.leaseManager.findExpiredLeases();

      if (expiredLeases.length > 0) {
        console.log(`Detected ${expiredLeases.length} expired lease(s)`);
      }

      // Mark each as expired
      for (const lease of expiredLeases) {
        await this.leaseManager.expireLease(lease.lease_id);
        console.log(`Expired lease ${lease.lease_id} for queue_item ${lease.queue_item_id}`);
      }

      // Detect stale workers (no heartbeat beyond threshold)
      const staleWorkers = await this.workerRegistry.findStaleWorkers(this.staleWorkerThresholdMs);

      if (staleWorkers.length > 0) {
        console.log(`Detected ${staleWorkers.length} stale worker(s)`);
      }

      // Deactivate stale workers
      for (const worker of staleWorkers) {
        await this.workerRegistry.deactivateWorker(worker.worker_id);
        console.log(`Deactivated stale worker ${worker.worker_id} (last heartbeat: ${worker.heartbeat_at})`);
      }

      // Phase 16.4 Stage 2: Detect abandoned execution claims
      const abandonedClaims = await this.claimManager.findAbandonedClaims(
        this.abandonedClaimThresholdMs
      );

      if (abandonedClaims.length > 0) {
        console.log(`Detected ${abandonedClaims.length} abandoned claim(s)`);
      }

      // Mark abandoned claims
      for (const claim of abandonedClaims) {
        await this.claimManager.markAbandoned(
          claim.claim_id,
          `Abandoned after ${this.abandonedClaimThresholdMs}ms without completion`
        );
        console.log(`Abandoned claim ${claim.claim_id} for queue_item ${claim.queue_item_id}`);
      }

      // Phase 16.4 Stage 3: Detect and recover stuck work
      const stuckItems = await this.recoveryManager.detectStuckWork();

      if (stuckItems.length > 0) {
        console.log(`Detected ${stuckItems.length} stuck work item(s)`);
      }

      // Recover stuck items
      for (const stuckItem of stuckItems) {
        try {
          const recoveryEvent = await this.recoveryManager.recoverStuckItem(stuckItem);
          console.log(
            `Recovered ${stuckItem.queue_item.id}: ${recoveryEvent.disposition} (${recoveryEvent.reason})`
          );
        } catch (error: any) {
          console.error(`Recovery failed for ${stuckItem.queue_item.id}:`, error.message);
        }
      }
    } catch (error) {
      console.error("Expiry detection failed:", error);
    }
  }

  /**
   * Manual trigger for testing/debugging
   */
  async detectOnce(): Promise<void> {
    await this.detectExpiredLeases();
  }
}
