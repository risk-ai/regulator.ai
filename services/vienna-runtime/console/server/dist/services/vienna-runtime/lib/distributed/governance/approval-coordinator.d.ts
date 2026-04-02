export = ApprovalCoordinator;
declare class ApprovalCoordinator {
    constructor(stateGraph: any, approvalManager: any);
    stateGraph: any;
    approvalManager: any;
    /**
     * Request cross-node approval
     */
    requestApproval(executionId: any, requestingNodeId: any, plan: any, context: any): Promise<{
        approval_id: string;
        internal_approval_id: any;
    }>;
    /**
     * Resolve cross-node approval
     */
    resolveApproval(approvalId: any, decision: any, operator: any): Promise<{
        resolved: boolean;
        decision: any;
    }>;
    /**
     * Get approval
     */
    getApproval(approvalId: any): Promise<{
        approval_id: any;
        execution_id: any;
        requesting_node_id: any;
        plan: any;
        context: any;
        status: any;
        created_at: any;
        resolved_at: any;
        approved_by: any;
        denied_by: any;
    }>;
    /**
     * List pending approvals
     */
    listPendingApprovals(): Promise<any>;
    _updateApproval(approvalId: any, updates: any): Promise<void>;
    _notifyNode(nodeId: any, notification: any): Promise<{
        notified: boolean;
    }>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=approval-coordinator.d.ts.map