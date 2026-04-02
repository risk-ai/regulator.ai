/**
 * Phase 16.3 — Queue Eligibility Evaluator
 *
 * Determines whether a queue item is eligible for scheduler consideration.
 */
import { isTerminalState } from "./state-machine";
export async function isQueueItemEligible(item, nowIso, deps) {
    // Terminal states are never eligible
    if (isTerminalState(item.state)) {
        return { eligible: false, reason: "terminal_state" };
    }
    // Check state-based eligibility
    if (item.state === "RETRY_SCHEDULED") {
        const nextRetryAt = item.retry.next_retry_at;
        if (!nextRetryAt || nextRetryAt > nowIso) {
            return { eligible: false, reason: "retry_not_due" };
        }
    }
    else if (item.state !== "READY") {
        return { eligible: false, reason: "not_ready" };
    }
    // Check resume condition if present
    const rc = item.resume_condition;
    if (!rc) {
        return { eligible: true };
    }
    return evaluateResumeCondition(rc, nowIso, deps);
}
async function evaluateResumeCondition(rc, nowIso, deps) {
    switch (rc.type) {
        case "lock_released": {
            const released = await deps.isLockReleased(rc.resource_keys);
            return released
                ? { eligible: true }
                : { eligible: false, reason: "lock_still_held" };
        }
        case "approval_granted": {
            const granted = await deps.isApprovalGranted(rc.approval_id);
            return granted
                ? { eligible: true }
                : { eligible: false, reason: "approval_not_granted" };
        }
        case "time_retry":
            return rc.not_before <= nowIso
                ? { eligible: true }
                : { eligible: false, reason: "time_not_reached" };
        case "dependency_complete": {
            const complete = await deps.isDependencyComplete(rc.dependency_execution_id);
            return complete
                ? { eligible: true }
                : { eligible: false, reason: "dependency_incomplete" };
        }
        default: {
            const _exhaustive = rc;
            return { eligible: false, reason: "unknown_resume_condition" };
        }
    }
}
export function compareQueueItems(a, b) {
    const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
    // 1. Priority ascending (P0 before P3)
    const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (p !== 0)
        return p;
    // 2. Oldest queued_at
    if (a.queued_at !== b.queued_at) {
        return a.queued_at < b.queued_at ? -1 : 1;
    }
    // 3. Lowest retry attempt count
    if (a.retry.attempt_count !== b.retry.attempt_count) {
        return a.retry.attempt_count - b.retry.attempt_count;
    }
    // 4. Stable ID
    return a.id.localeCompare(b.id);
}
//# sourceMappingURL=eligibility.js.map