/**
 * Phase 16.3 — Queue Repository
 *
 * Durable queue storage with State Graph integration.
 */
import { QueueItem, QueueState, EnqueueDeferredIntentInput, QueueTransitionInput } from "./types";
export declare class QueueRepository {
    private stateGraph;
    enqueueItem(input: EnqueueDeferredIntentInput): Promise<QueueItem>;
    getItem(id: string): Promise<QueueItem | null>;
    listEligibleItems(limit?: number): Promise<QueueItem[]>;
    transitionItem(input: QueueTransitionInput): Promise<QueueItem>;
    listItemsByState(state: QueueState, limit?: number): Promise<QueueItem[]>;
    listByState(state: QueueState, limit?: number): Promise<QueueItem[]>;
    listByPlan(planId: string): Promise<QueueItem[]>;
    listByApproval(approvalId: string): Promise<QueueItem[]>;
    private rowToItem;
}
//# sourceMappingURL=repository.d.ts.map