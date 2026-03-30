export = WorkDistributor;
declare class WorkDistributor {
    constructor(stateGraph: any, nodeRegistry: any);
    stateGraph: any;
    nodeRegistry: any;
    /**
     * Select node for execution
     */
    selectNode(plan: any, options?: {}): Promise<{
        node: any;
        candidates: any;
        strategy: any;
    }>;
    /**
     * Create work distribution record
     */
    createDistribution(executionId: any, planId: any, selectedNode: any, candidateNodes: any, strategy: any): Promise<string>;
    /**
     * Update distribution status
     */
    updateDistributionStatus(distributionId: any, status: any): Promise<void>;
    /**
     * Get distribution
     */
    getDistribution(distributionId: any): Promise<{
        distribution_id: any;
        execution_id: any;
        plan_id: any;
        selected_node_id: any;
        selection_strategy: any;
        candidate_nodes: any;
        selection_reason: any;
        distributed_at: any;
        status: any;
    }>;
    _selectLeastLoaded(nodes: any): any;
    _selectByRegion(nodes: any, preferredRegion: any): any;
    _selectByEnvironment(nodes: any, preferredEnv: any): any;
    _getSelectionReason(node: any, strategy: any): string;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=work-distributor.d.ts.map