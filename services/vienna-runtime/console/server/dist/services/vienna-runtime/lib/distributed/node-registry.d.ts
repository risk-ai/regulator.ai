export = NodeRegistry;
declare class NodeRegistry {
    constructor(stateGraph: any);
    stateGraph: any;
    heartbeatInterval: number;
    heartbeatTimeout: number;
    nodes: Map<any, any>;
    useInMemory: boolean;
    /**
     * Register node
     */
    registerNode(node: any): Promise<any> | {
        registered: boolean;
        node_id: any;
    };
    _registerNodeAsync(node: any): Promise<any>;
    /**
     * Get node by ID
     */
    getNode(nodeId: any): Promise<{
        node_id: any;
        node_type: any;
        capabilities: any;
        environment: any;
        region: any;
        host: any;
        status: any;
        last_heartbeat_at: any;
        metadata: any;
        registered_at: any;
    }>;
    /**
     * List nodes
     */
    listNodes(filters?: {}): Promise<any>;
    /**
     * Update node heartbeat
     */
    updateHeartbeat(nodeId: any): Promise<{
        node_id: any;
        last_heartbeat_at: string;
    }>;
    /**
     * Update node capabilities
     */
    updateCapabilities(nodeId: any, capabilities: any): Promise<void>;
    /**
     * Update node status
     */
    updateNodeStatus(nodeId: any, status: any): Promise<void>;
    /**
     * Check for stale nodes and mark offline
     */
    checkStaleNodes(): Promise<any>;
    /**
     * Find capable nodes for plan
     */
    findCapableNodes(plan: any): Promise<any>;
    /**
     * Deregister node
     */
    deregisterNode(nodeId: any): Promise<void>;
    _extractCapabilities(plan: any): {
        action_type: any;
        target_id: any;
    }[];
    _deserializeNode(row: any): {
        node_id: any;
        node_type: any;
        capabilities: any;
        environment: any;
        region: any;
        host: any;
        status: any;
        last_heartbeat_at: any;
        metadata: any;
        registered_at: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=node-registry.d.ts.map