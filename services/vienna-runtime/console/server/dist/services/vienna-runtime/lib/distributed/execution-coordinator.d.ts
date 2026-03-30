export = ExecutionCoordinator;
declare class ExecutionCoordinator {
    constructor(stateGraph: any, nodeRegistry: any, workDistributor: any, lockManager: any);
    stateGraph: any;
    nodeRegistry: any;
    workDistributor: any;
    lockManager: any;
    /**
     * Dispatch execution to node
     */
    dispatchExecution(executionId: any, plan: any, context: any, options?: {}): Promise<{
        coordination_id: string;
        distribution_id: any;
        node_id: any;
        lock_id: any;
    }>;
    /**
     * Handle execution result
     */
    handleExecutionResult(coordinationId: any, result: any): Promise<any>;
    /**
     * Handle execution timeout
     */
    handleExecutionTimeout(coordinationId: any): Promise<void>;
    /**
     * Get coordination
     */
    getCoordination(coordinationId: any): Promise<{
        coordination_id: any;
        execution_id: any;
        node_id: any;
        plan: any;
        context: any;
        lock_id: any;
        dispatched_at: any;
        acknowledged_at: any;
        started_at: any;
        completed_at: any;
        result: any;
        status: any;
    }>;
    /**
     * List coordinations
     */
    listCoordinations(filters?: {}): Promise<any>;
    _createCoordination(executionId: any, nodeId: any, plan: any, context: any, lockId: any): Promise<string>;
    _updateCoordination(coordinationId: any, updates: any): Promise<void>;
    _sendExecuteRequest(node: any, executionId: any, plan: any, context: any, lockId: any): Promise<any>;
    _sendCancelRequest(nodeId: any, executionId: any): Promise<any>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=execution-coordinator.d.ts.map