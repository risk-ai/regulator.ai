/**
 * Phase 16.4 Stage 3 — Recovery Manager
 *
 * Safe recovery from stuck/uncertain execution states.
 * Fail-closed policy: when execution certainty is lost, mark FAILED + require operator review.
 */
import { getStateGraph } from "../state/state-graph";
import { QueueRepository } from "./repository";
import { LeaseManager } from "./lease-manager";
import { ClaimManager } from "./claim-manager";
export class RecoveryManager {
    stateGraph = getStateGraph();
    repository = new QueueRepository();
    leaseManager = new LeaseManager();
    claimManager = new ClaimManager();
    // Thresholds
    staleRunningThresholdMs = 60000; // 1 minute (RUNNING without progress)
    staleTransitionalThresholdMs = 30000; // 30 seconds (LEASED/GOVERNANCE_REENTRY)
    async initialize() {
        await this.stateGraph.initialize();
    }
    /**
     * Detect stuck work items across all states
     */
    async detectStuckWork() {
        await this.initialize();
        const stuckItems = [];
        // Case 1: RUNNING items with expired leases
        const runningItems = await this.repository.listItemsByState("RUNNING");
        const now = Date.now();
        for (const item of runningItems) {
            // Check lease status
            const activeLease = await this.leaseManager.getActiveLease(item.id);
            const leaseExpired = !activeLease || new Date(activeLease.expires_at).getTime() < now;
            // Check claim status
            const activeClaim = await this.claimManager.getActiveClaim(item.id);
            const claimAbandoned = !activeClaim || activeClaim.status === "ABANDONED";
            // Determine stuck duration
            const stuckSince = item.started_at || item.updated_at;
            const stuckDuration = now - new Date(stuckSince).getTime();
            if (leaseExpired || claimAbandoned || stuckDuration > this.staleRunningThresholdMs) {
                stuckItems.push({
                    queue_item: item,
                    stuck_reason: this.determineStuckReason(item, leaseExpired, claimAbandoned, stuckDuration),
                    stuck_since: stuckSince,
                    lease_expired: leaseExpired,
                    claim_abandoned: claimAbandoned,
                    recommended_disposition: this.determineRecoveryDisposition(item, leaseExpired, claimAbandoned, activeClaim),
                });
            }
        }
        return stuckItems;
    }
    /**
     * Recover stuck work item (execute recommended disposition)
     */
    async recoverStuckItem(stuckItem) {
        await this.initialize();
        const db = this.stateGraph.db;
        const now = new Date().toISOString();
        const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const event = {
            recovery_id: recoveryId,
            queue_item_id: stuckItem.queue_item.id,
            disposition: stuckItem.recommended_disposition,
            detected_at: now,
            reason: stuckItem.stuck_reason,
            metadata: {
                lease_expired: stuckItem.lease_expired,
                claim_abandoned: stuckItem.claim_abandoned,
                stuck_since: stuckItem.stuck_since,
            },
        };
        try {
            switch (stuckItem.recommended_disposition) {
                case "RECLAIM":
                    await this.reclaimItem(stuckItem.queue_item);
                    break;
                case "REQUEUE":
                    await this.requeueItem(stuckItem.queue_item);
                    break;
                case "FAIL_CLOSED":
                    await this.failClosedItem(stuckItem.queue_item, stuckItem.stuck_reason);
                    break;
                case "CANCEL":
                    await this.cancelItem(stuckItem.queue_item);
                    break;
                case "IGNORE":
                    // Do nothing (false positive or explicitly ignored)
                    break;
            }
            event.resolved_at = new Date().toISOString();
            // Emit recovery event to ledger
            await this.emitRecoveryEvent(event);
            return event;
        }
        catch (error) {
            console.error(`Recovery failed for ${stuckItem.queue_item.id}:`, error);
            throw error;
        }
    }
    /**
     * Reclaim item (safe to retry)
     */
    async reclaimItem(item) {
        // Clear lease + claim, transition back to eligible state via valid path
        // RUNNING can only transition to terminal states or RETRY_SCHEDULED
        await this.repository.transitionItem({
            queue_item_id: item.id,
            from_state: "RUNNING",
            to_state: "RETRY_SCHEDULED",
            reason: "RECOVERY_RECLAIM",
            resumed_by: "recovery_manager",
        });
        console.log(`Reclaimed queue item ${item.id} (marked for retry)`);
    }
    /**
     * Requeue item (retry with new attempt)
     */
    async requeueItem(item) {
        // Transition to RETRY_SCHEDULED with incremented attempt
        await this.repository.transitionItem({
            queue_item_id: item.id,
            from_state: "RUNNING",
            to_state: "RETRY_SCHEDULED",
            reason: "RECOVERY_REQUEUE",
            resumed_by: "recovery_manager",
        });
        console.log(`Requeued queue item ${item.id}`);
    }
    /**
     * Fail-closed item (uncertain execution)
     */
    async failClosedItem(item, reason) {
        // Mark as FAILED with recovery-required flag
        const metadata = {
            recovery_required: true,
            original_reason: reason,
            fail_closed_at: new Date().toISOString(),
        };
        await this.repository.transitionItem({
            queue_item_id: item.id,
            from_state: "RUNNING",
            to_state: "FAILED",
            reason: "RECOVERY_FAIL_CLOSED",
            metadata,
        });
        console.log(`Fail-closed queue item ${item.id}: ${reason}`);
    }
    /**
     * Cancel item (superseded or invalid)
     */
    async cancelItem(item) {
        await this.repository.transitionItem({
            queue_item_id: item.id,
            from_state: "RUNNING",
            to_state: "CANCELLED",
            reason: "RECOVERY_CANCEL",
            resumed_by: "recovery_manager",
        });
        console.log(`Cancelled queue item ${item.id}`);
    }
    /**
     * Determine stuck reason
     */
    determineStuckReason(item, leaseExpired, claimAbandoned, stuckDuration) {
        if (leaseExpired && claimAbandoned) {
            return "Lease expired + claim abandoned";
        }
        if (leaseExpired) {
            return "Lease expired without completion";
        }
        if (claimAbandoned) {
            return "Claim abandoned without completion";
        }
        if (stuckDuration > this.staleRunningThresholdMs) {
            return `RUNNING beyond threshold (${stuckDuration}ms)`;
        }
        return "Unknown stuck condition";
    }
    /**
     * Determine recovery disposition (fail-closed by default)
     */
    determineRecoveryDisposition(item, leaseExpired, claimAbandoned, activeClaim, hasStartedClaim) {
        // Case 1: Claim was started (STARTED or ABANDONED after STARTED)
        if (hasStartedClaim) {
            return "FAIL_CLOSED"; // Uncertain execution, require operator review
        }
        // Case 2: Lease expired before claim created
        if (leaseExpired && !activeClaim && !claimAbandoned) {
            return "RECLAIM"; // Safe to retry (no execution started)
        }
        // Case 3: Claim created but never started
        if (activeClaim && activeClaim.status === "CLAIMED") {
            return "RECLAIM"; // Safe to retry (no execution started)
        }
        // Default: fail closed on uncertainty
        return "FAIL_CLOSED";
    }
    /**
     * Emit recovery event to audit trail
     */
    async emitRecoveryEvent(event) {
        const db = this.stateGraph.db;
        db.prepare(`
      INSERT INTO recovery_events (
        recovery_id, queue_item_id, disposition, detected_at, resolved_at,
        reason, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(event.recovery_id, event.queue_item_id, event.disposition, event.detected_at, event.resolved_at || null, event.reason, event.metadata ? JSON.stringify(event.metadata) : null);
    }
    /**
     * List recovery events by queue item
     */
    async listRecoveryEvents(queueItemId) {
        await this.initialize();
        const db = this.stateGraph.db;
        const query = queueItemId
            ? `SELECT * FROM recovery_events WHERE queue_item_id = ? ORDER BY detected_at DESC`
            : `SELECT * FROM recovery_events ORDER BY detected_at DESC LIMIT 100`;
        const rows = queueItemId
            ? db.prepare(query).all(queueItemId)
            : db.prepare(query).all();
        return rows.map((row) => ({
            recovery_id: row.recovery_id,
            queue_item_id: row.queue_item_id,
            disposition: row.disposition,
            detected_at: row.detected_at,
            resolved_at: row.resolved_at || undefined,
            reason: row.reason,
            metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
        }));
    }
}
//# sourceMappingURL=recovery-manager.js.map