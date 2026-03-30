export = RemoteDispatcher;
declare class RemoteDispatcher {
    constructor(stateGraph: any, nodeRegistry: any, lockManager: any, options?: {});
    stateGraph: any;
    nodeRegistry: any;
    lockManager: any;
    maxRetries: any;
    acknowledgmentTimeout: any;
    transport: any;
    /**
     * Dispatch execution with retry
     */
    dispatchWithRetry(executionId: any, plan: any, context: any, options?: {}): Promise<any>;
    /**
     * Dispatch to specific node
     */
    dispatchToNode(nodeId: any, executionId: any, plan: any, context: any): Promise<any>;
    /**
     * Cancel remote execution
     */
    cancelExecution(nodeId: any, executionId: any, reason: any): Promise<any>;
    _selectNode(plan: any, context: any, options?: {}): Promise<any>;
    _extractCapabilities(plan: any): {
        action_type: any;
        target_id: any;
    }[];
    _checkCapabilities(node: any, requiredCapabilities: any): any[];
    _sendExecuteRequest(node: any, payload: any): Promise<any>;
    _sendCancelRequest(node: any, executionId: any, reason: any): Promise<any>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=remote-dispatcher.d.ts.map