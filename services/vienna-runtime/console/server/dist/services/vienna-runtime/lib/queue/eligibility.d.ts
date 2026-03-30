/**
 * Phase 16.3 — Queue Eligibility Evaluator
 *
 * Determines whether a queue item is eligible for scheduler consideration.
 */
import { QueueItem, SchedulerEligibilityResult } from "./types";
export interface EligibilityDependencies {
    isLockReleased: (keys: string[]) => boolean | Promise<boolean>;
    isApprovalGranted: (approvalId: string) => boolean | Promise<boolean>;
    isDependencyComplete: (executionId: string) => boolean | Promise<boolean>;
}
export declare function isQueueItemEligible(item: QueueItem, nowIso: string, deps: EligibilityDependencies): Promise<SchedulerEligibilityResult>;
export declare function compareQueueItems(a: QueueItem, b: QueueItem): number;
//# sourceMappingURL=eligibility.d.ts.map