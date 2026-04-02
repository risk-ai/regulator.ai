/**
 * Phase 16.4 Stage 4 — Coordination Manager
 *
 * Cross-state coordination: supersession, dependency wakeup, duplicate-intent prevention.
 */
export type SupersessionReason = "PLAN_REVISED" | "OPERATOR_CANCELLED" | "DEPENDENCY_INVALIDATED" | "POLICY_SUPERSEDED";
export type SupersessionRecord = {
    queue_item_id: string;
    superseded_by_queue_item_id?: string;
    reason: SupersessionReason;
    created_at: string;
};
export type IntentDedupKey = string;
export declare class CoordinationManager {
    private stateGraph;
    private repository;
    initialize(): Promise<void>;
    /**
     * Generate dedup key for intent
     *
     * Formula: plan_id:step_id:intent_id
     */
    generateDedupKey(planId: string, stepId: string, intentId: string): IntentDedupKey;
    /**
     * Check for duplicate intent (by dedupe key)
     */
    checkDuplicateIntent(planId: string, stepId: string, intentId: string): Promise<{
        exists: boolean;
        existing_queue_item_id?: string;
    }>;
    /**
     * Supersede queue item (mark as cancelled + record supersession)
     */
    supersede(queueItemId: string, reason: SupersessionReason, supersededBy?: string): Promise<SupersessionRecord>;
    /**
     * Wake up items blocked on dependency completion
     */
    wakeupDependents(executionId: string): Promise<string[]>;
    /**
     * List superseded items
     */
    listSuperseded(limit?: number): Promise<SupersessionRecord[]>;
    /**
     * Get supersession record by queue item
     */
    getSupersession(queueItemId: string): Promise<SupersessionRecord | null>;
}
//# sourceMappingURL=coordination-manager.d.ts.map