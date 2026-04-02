/**
 * Federation Node
 */
export class FederationNode {
    constructor(data: any);
    node_id: any;
    node_type: any;
    endpoint_url: any;
    capabilities: any;
    trust_level: any;
    public_key: any;
    status: any;
    health_score: any;
    last_heartbeat: any;
    registered_at: any;
    metadata: any;
    /**
     * Check if node can execute action
     */
    canExecute(action: any): any;
    /**
     * Verify trust
     */
    isTrusted(): boolean;
    toJSON(): {
        node_id: any;
        node_type: any;
        endpoint_url: any;
        capabilities: any;
        trust_level: any;
        status: any;
        health_score: any;
        last_heartbeat: any;
        registered_at: any;
        metadata: any;
    };
}
/**
 * Federated Execution Request
 */
export class FederatedExecutionRequest {
    constructor(data: any);
    request_id: any;
    source_node: any;
    target_node: any;
    plan: any;
    context: any;
    governance_context: any;
    signature: any;
    created_at: any;
    /**
     * Sign the request
     */
    sign(privateKey: any): any;
    /**
     * Verify signature
     */
    verify(publicKey: any): boolean;
    _generateId(): string;
    toJSON(): {
        request_id: any;
        source_node: any;
        target_node: any;
        plan: any;
        context: any;
        governance_context: any;
        signature: any;
        created_at: any;
    };
}
/**
 * Federated Execution Result
 */
export class FederatedExecutionResult {
    constructor(data: any);
    request_id: any;
    executed_by: any;
    status: any;
    result: any;
    execution_id: any;
    verification_id: any;
    ledger_events: any;
    provenance_chain: any;
    signature: any;
    completed_at: any;
    sign(privateKey: any): any;
    toJSON(): {
        request_id: any;
        executed_by: any;
        status: any;
        result: any;
        execution_id: any;
        verification_id: any;
        ledger_events: any;
        provenance_chain: any;
        signature: any;
        completed_at: any;
    };
}
/**
 * Federation Manager
 */
export class FederationManager {
    nodes: Map<any, any>;
    pendingRequests: Map<any, any>;
    /**
     * Register a federation node
     */
    registerNode(nodeData: any): FederationNode;
    /**
     * Get node by ID
     */
    getNode(nodeId: any): any;
    /**
     * List nodes
     */
    listNodes(filters?: {}): any[];
    /**
     * Find capable nodes for action
     */
    findCapableNodes(action: any): any[];
    /**
     * Delegate execution to remote node
     */
    delegateExecution(plan: any, targetNodeId: any, context?: {}): Promise<FederatedExecutionResult>;
    /**
     * Accept execution request from remote node
     */
    acceptExecutionRequest(request: any, localContext?: {}): Promise<FederatedExecutionResult>;
    /**
     * Verify governance context from federated request
     */
    _verifyGovernanceContext(governanceContext: any): boolean;
    /**
     * Simulate remote execution (placeholder for real HTTP call)
     */
    _simulateRemoteExecution(request: any, targetNode: any): Promise<FederatedExecutionResult>;
    /**
     * Get pending request
     */
    getPendingRequest(requestId: any): any;
    /**
     * List pending requests
     */
    listPendingRequests(filters?: {}): any[];
    /**
     * Update node health
     */
    updateNodeHealth(nodeId: any, healthScore: any, heartbeat: any): any;
    /**
     * Establish trust with remote node
     */
    establishTrust(nodeId: any, verificationProof: any): Promise<any>;
}
/**
 * Cross-System Reconciliation Adapter
 */
export class CrossSystemAdapter {
    constructor(config: any);
    system_type: any;
    endpoint: any;
    auth: any;
    /**
     * Reconcile state with external system
     */
    reconcile(targetState: any, currentState: any): Promise<{
        reconciled: boolean;
        changes_applied: any[];
        system_type: any;
    }>;
    /**
     * Query external system state
     */
    queryState(query: any): Promise<{
        state: {};
        system_type: any;
    }>;
}
export function getFederationManager(): any;
//# sourceMappingURL=federation.d.ts.map