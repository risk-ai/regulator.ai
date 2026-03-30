export = NodeRegistry;
/**
 * In-Memory Node Registry
 *
 * Lightweight implementation for testing and single-node deployments
 * Phase 19 — Distributed Execution
 */
declare class NodeRegistry {
    nodes: Map<any, any>;
    heartbeatTimeout: number;
    registerNode(node: any): {
        registered: boolean;
        node_id: any;
    };
    getNode(nodeId: any): any;
    findNodesByCapability(capability: any, options?: {}): any[];
    findNodesByCapabilities(capabilities: any): any[];
    listAllCapabilities(): any[];
    getCapabilityCounts(): {};
    updateHeartbeat(nodeId: any): {
        node_id: any;
        last_heartbeat: any;
    };
    checkNodeHealth(nodeId: any, options?: {}): {
        health_status: string;
        reason: string;
        age_ms: number;
    } | {
        health_status: string;
        age_ms: number;
        reason?: undefined;
    };
    recordFailedHeartbeat(nodeId: any): void;
    updateLoad(nodeId: any, load: any): void;
    getAverageLoad(): number;
    getClusterStatus(): {
        total_nodes: number;
        avg_load: number;
        overloaded: boolean;
    };
    deregisterNode(nodeId: any): {
        deregistered: boolean;
        deregistered_at: string;
    };
}
//# sourceMappingURL=node-registry-memory.d.ts.map