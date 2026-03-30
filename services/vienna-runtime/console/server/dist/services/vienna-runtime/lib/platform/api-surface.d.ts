/**
 * Vienna Platform API v1
 */
export class ViennaPlatformAPI {
    constructor(config?: {});
    version: string;
    config: {};
    tenantId: any;
    callerIdentity: any;
    stateGraph: any;
    intentClassifier: IntentClassifier;
    planGenerator: any;
    approvalManager: any;
    executionEngine: PlanExecutionEngine;
    verificationEngine: VerificationEngine;
    ledger: any;
    lockManager: any;
    /**
     * Intent API
     */
    submitIntent(naturalLanguageInput: any, context?: {}): Promise<{
        intent_id: any;
        intent_type: any;
        confidence: any;
        normalized_action: any;
        entities: any;
        tenant_id: any;
    }>;
    getIntent(intentId: any): Promise<any>;
    listIntents(filters?: {}): Promise<any>;
    /**
     * Plan API
     */
    createPlan(intentObject: any, options?: {}): Promise<any>;
    getPlan(planId: any): Promise<any>;
    listPlans(filters?: {}): Promise<any>;
    updatePlanStatus(planId: any, newStatus: any, metadata?: {}): Promise<any>;
    /**
     * Approval API
     */
    requestApproval(planId: any, approvalMetadata?: {}): Promise<any>;
    getApproval(approvalId: any): Promise<any>;
    listPendingApprovals(filters?: {}): Promise<any>;
    grantApproval(approvalId: any, decision?: {}): Promise<any>;
    denyApproval(approvalId: any, reason: any, decision?: {}): Promise<any>;
    /**
     * Execution API
     */
    executePlan(planId: any, executionContext?: {}): Promise<any>;
    getExecution(executionId: any): Promise<any>;
    listExecutions(filters?: {}): Promise<any>;
    cancelExecution(executionId: any, reason: any): Promise<any>;
    /**
     * Verification API
     */
    getVerification(verificationId: any): Promise<any>;
    listVerifications(filters?: {}): Promise<any>;
    /**
     * Ledger API
     */
    queryLedger(query?: {}): Promise<any>;
    getExecutionTimeline(executionId: any): Promise<any>;
    exportLedger(filters?: {}, format?: string): Promise<any>;
    /**
     * Node API (for distributed execution)
     */
    registerNode(nodeMetadata: any): Promise<any>;
    getNode(nodeId: any): Promise<any>;
    listNodes(filters?: {}): Promise<any>;
    updateNodeStatus(nodeId: any, status: any, metadata?: {}): Promise<any>;
    /**
     * Lock API
     */
    acquireLock(resourceId: any, executionId: any, ttlSeconds?: number): Promise<any>;
    releaseLock(resourceId: any, executionId: any): Promise<any>;
    getLockStatus(resourceId: any): Promise<any>;
    /**
     * Permission enforcement
     */
    _requirePermission(permission: any): void;
    /**
     * Tenant boundary enforcement
     */
    _enforceTenantBoundary(entity: any): void;
}
/**
 * Factory function for platform API
 */
export function createPlatformAPI(config: any): ViennaPlatformAPI;
import { IntentClassifier } from "../core/intent-classifier";
import { PlanExecutionEngine } from "../core/plan-execution-engine";
import { VerificationEngine } from "../core/verification-engine";
//# sourceMappingURL=api-surface.d.ts.map