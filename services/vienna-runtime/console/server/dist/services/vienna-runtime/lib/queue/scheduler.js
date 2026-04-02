/**
 * Phase 16.3 — Queue Scheduler
 * Phase 16.4 Stage 1 — Lease-aware scheduler with worker registry
 *
 * Deterministic scheduler loop for queued work resumption.
 * Single-process scheduler with multi-worker-safe primitives.
 */
import { QueueRepository } from "./repository";
import { isQueueItemEligible, compareQueueItems } from "./eligibility";
import { emitQueueLedgerEvent } from "./ledger-events";
import { computeNextRetryAt, shouldRetry, incrementRetryAttempt } from "./retry";
import { WorkerRegistry } from "./worker-registry";
import { LeaseManager } from "./lease-manager";
export class QueueScheduler {
    repository = new QueueRepository();
    workerRegistry = new WorkerRegistry();
    leaseManager = new LeaseManager();
    claimManager = new ClaimManager();
    running = false;
    intervalMs;
    intervalHandle;
    workerId;
    leaseTtlMs = 30000; // 30 seconds
    constructor(intervalMs = 5000, workerId) {
        this.intervalMs = intervalMs;
        this.workerId = workerId || `worker_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
    async start(deps) {
        if (this.running) {
            throw new Error("Scheduler already running");
        }
        // Phase 16.4: Register worker and start heartbeat
        await this.workerRegistry.registerWorker(this.workerId, "16.4-stage-1");
        this.workerRegistry.startHeartbeat(this.workerId);
        this.running = true;
        this.intervalHandle = setInterval(() => {
            this.runSchedulerCycle(deps).catch(err => {
                console.error("Scheduler cycle error:", err);
            });
        }, this.intervalMs);
        console.log(`Queue scheduler started (worker: ${this.workerId}, interval: ${this.intervalMs}ms)`);
    }
    async stop() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = undefined;
        }
        // Phase 16.4: Stop heartbeat and deactivate worker
        this.workerRegistry.stopHeartbeat();
        await this.workerRegistry.deactivateWorker(this.workerId);
        console.log("Queue scheduler stopped");
    }
    async runSchedulerCycle(deps) {
        if (!this.running) {
            return;
        }
        const now = new Date().toISOString();
        try {
            // Get candidate items
            const candidates = await this.repository.listEligibleItems(50);
            // Filter by eligibility
            const eligibleItems = [];
            for (const item of candidates) {
                const result = await isQueueItemEligible(item, now, deps);
                if (result.eligible) {
                    eligibleItems.push(item);
                }
            }
            // Sort by priority
            eligibleItems.sort(compareQueueItems);
            // Process items (one at a time for v1)
            for (const item of eligibleItems.slice(0, 1)) {
                await this.processQueueItem(item, deps);
            }
        }
        catch (error) {
            console.error("Scheduler cycle failed:", error);
        }
    }
    async processQueueItem(item, deps) {
        // Phase 16.4 Stage 1: Acquire exclusive lease (atomic CAS)
        const leaseResult = await this.leaseManager.acquireLease(item.id, this.workerId, this.leaseTtlMs);
        if (!leaseResult.acquired) {
            // Another scheduler got it or lease conflict
            return;
        }
        const lease = leaseResult.lease;
        try {
            await emitQueueLedgerEvent("QUEUE_ITEM_LEASE_ACQUIRED", item, {
                lease_id: lease.lease_id,
                worker_id: this.workerId,
                expires_at: lease.expires_at,
            });
            // Phase 16.4 Stage 2: Acquire execution claim (atomic, exactly-once)
            const claimResult = await this.claimManager.acquireClaim(item.id, item.retry.attempt_count + 1, // Current attempt number
            this.workerId, { lease_id: lease.lease_id });
            if (!claimResult.claimed) {
                // Duplicate claim detected - another scheduler already claimed this attempt
                console.warn(`Claim acquisition failed for ${item.id}: ${claimResult.reason}`);
                return; // Lease will be released in finally block
            }
            const claim = claimResult.claim;
            // Transition to RUNNING
            const runningItem = await this.repository.transitionItem({
                queue_item_id: item.id,
                from_state: item.state,
                to_state: "RUNNING",
                reason: "SCHEDULER_RESUME",
                resumed_by: "scheduler",
            });
            // Mark claim as STARTED
            await this.claimManager.markStarted(claim.claim_id, this.workerId);
            // Governance re-entry
            const reentryRequest = {
                queue_item_id: runningItem.id,
                plan_id: runningItem.plan_id,
                step_id: runningItem.step_id,
                intent_id: runningItem.intent_id,
                execution_id: runningItem.execution_id,
                approval_id: runningItem.approval_id,
                warrant_id: runningItem.warrant_id,
                verification_template_id: runningItem.verification_template_id,
                requested_by: runningItem.requested_by,
                approved_by: runningItem.approved_by,
                resumed_by: "scheduler",
                risk_tier: runningItem.risk_tier,
                resource_keys: runningItem.resource_keys,
            };
            await emitQueueLedgerEvent("QUEUE_ITEM_GOVERNANCE_REENTRY_STARTED", runningItem, {
                claim_id: claim.claim_id,
                execution_key: claim.execution_key,
                attempt_number: claim.attempt_number,
            });
            const reentryResult = await deps.executeGovernanceReentry(reentryRequest);
            if (reentryResult.allowed) {
                // Success - mark claim as COMPLETED
                await this.claimManager.markCompleted(claim.claim_id, this.workerId, `Execution ${reentryResult.execution_id} succeeded`);
                await emitQueueLedgerEvent("QUEUE_ITEM_GOVERNANCE_REENTRY_PASSED", runningItem, {
                    execution_id: reentryResult.execution_id,
                    claim_id: claim.claim_id,
                });
                await this.repository.transitionItem({
                    queue_item_id: runningItem.id,
                    from_state: "RUNNING",
                    to_state: "COMPLETED",
                    reason: "EXECUTION_SUCCEEDED",
                    resumed_by: "scheduler",
                });
            }
            else {
                // Governance denied - mark claim as FAILED
                await this.claimManager.markFailed(claim.claim_id, this.workerId, `Governance denied: ${reentryResult.transition_reason}`);
                // Governance denied - requeue or cancel
                if (reentryResult.disposition === "REQUEUE") {
                    await emitQueueLedgerEvent("QUEUE_ITEM_GOVERNANCE_REENTRY_REQUEUED", runningItem, {
                        transition_reason: reentryResult.transition_reason,
                    });
                    // Check if we should retry
                    if (item.retry_policy && shouldRetry(item.retry, item.retry_policy)) {
                        const nextRetryAt = computeNextRetryAt(new Date(), item.retry, item.retry_policy);
                        if (nextRetryAt) {
                            await this.repository.transitionItem({
                                queue_item_id: runningItem.id,
                                from_state: "RUNNING",
                                to_state: reentryResult.state,
                                reason: reentryResult.transition_reason,
                                blocked_reason: reentryResult.blocked_reason,
                                resume_condition: reentryResult.resume_condition,
                                next_retry_at: nextRetryAt,
                            });
                        }
                        else {
                            // Max retries exhausted
                            await this.repository.transitionItem({
                                queue_item_id: runningItem.id,
                                from_state: "RUNNING",
                                to_state: "FAILED",
                                reason: "MAX_RETRIES_EXHAUSTED",
                            });
                        }
                    }
                    else {
                        // No retry policy or not retryable
                        await this.repository.transitionItem({
                            queue_item_id: runningItem.id,
                            from_state: "RUNNING",
                            to_state: reentryResult.state,
                            reason: reentryResult.transition_reason,
                            blocked_reason: reentryResult.blocked_reason,
                            resume_condition: reentryResult.resume_condition,
                        });
                    }
                }
                else {
                    // CANCEL
                    await emitQueueLedgerEvent("QUEUE_ITEM_GOVERNANCE_REENTRY_CANCELLED", runningItem, {
                        transition_reason: reentryResult.transition_reason,
                    });
                    await this.repository.transitionItem({
                        queue_item_id: runningItem.id,
                        from_state: "RUNNING",
                        to_state: "CANCELLED",
                        reason: reentryResult.transition_reason,
                    });
                }
            }
        }
        catch (error) {
            // Execution failed - mark claim as FAILED
            const errorMessage = error.message || String(error);
            // Try to mark claim as failed if it exists
            const activeClaim = await this.claimManager.getActiveClaim(item.id);
            if (activeClaim) {
                await this.claimManager.markFailed(activeClaim.claim_id, this.workerId, errorMessage);
            }
            // Execution failed - check retry policy
            const errorMetadata = {
                error_code: error.code,
                error_message: errorMessage,
            };
            if (item.retry_policy && shouldRetry(item.retry, item.retry_policy)) {
                const updatedRetry = incrementRetryAttempt(item.retry, errorMetadata);
                const nextRetryAt = computeNextRetryAt(new Date(), updatedRetry, item.retry_policy);
                if (nextRetryAt) {
                    await this.repository.transitionItem({
                        queue_item_id: item.id,
                        from_state: "RUNNING",
                        to_state: "RETRY_SCHEDULED",
                        reason: "EXECUTION_ERROR_RETRY",
                        next_retry_at: nextRetryAt,
                        metadata: errorMetadata,
                    });
                }
                else {
                    await this.repository.transitionItem({
                        queue_item_id: item.id,
                        from_state: "RUNNING",
                        to_state: "FAILED",
                        reason: "MAX_RETRIES_EXHAUSTED",
                        metadata: errorMetadata,
                    });
                }
            }
            else {
                await this.repository.transitionItem({
                    queue_item_id: item.id,
                    from_state: "RUNNING",
                    to_state: "FAILED",
                    reason: "EXECUTION_ERROR_NO_RETRY",
                    metadata: errorMetadata,
                });
            }
        }
        finally {
            // Phase 16.4 Stage 1: Release lease (guaranteed cleanup)
            await this.leaseManager.releaseLease(lease.lease_id, this.workerId);
        }
    }
}
//# sourceMappingURL=scheduler.js.map