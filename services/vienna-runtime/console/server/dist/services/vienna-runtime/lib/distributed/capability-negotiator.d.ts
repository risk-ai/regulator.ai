export = CapabilityNegotiator;
/**
 * Capability Negotiator
 *
 * Capability registration and dynamic updates
 * Phase 19.1 — Remote Execution
 */
declare class CapabilityNegotiator {
    constructor(stateGraph: any, nodeRegistry: any);
    stateGraph: any;
    nodeRegistry: any;
    /**
     * Validate capability format
     */
    validateCapability(capability: any): boolean;
    /**
     * Add capability to node
     */
    addCapability(nodeId: any, capability: any): Promise<{
        capability_added: boolean;
    }>;
    /**
     * Remove capability from node
     */
    removeCapability(nodeId: any, actionType: any, reason: any): Promise<{
        capability_removed: boolean;
        reason: any;
    }>;
    /**
     * Update capability metadata
     */
    updateCapability(nodeId: any, actionType: any, metadata: any): Promise<{
        capability_updated: boolean;
    }>;
    /**
     * Negotiate capabilities for plan
     */
    negotiateCapabilities(plan: any): Promise<{
        can_execute: boolean;
        missing_capabilities: any[];
        capable_nodes: any[];
    } | {
        can_execute: boolean;
        missing_capabilities: any[];
        capable_nodes: any;
    }>;
    /**
     * Get node capabilities
     */
    getNodeCapabilities(nodeId: any): Promise<any>;
    _extractCapabilities(plan: any): {
        action_type: any;
        target_id: any;
    }[];
}
//# sourceMappingURL=capability-negotiator.d.ts.map