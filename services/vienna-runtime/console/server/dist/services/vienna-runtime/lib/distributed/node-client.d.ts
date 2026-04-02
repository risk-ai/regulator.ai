export = NodeClient;
/**
 * Node Client
 *
 * Client for executor nodes to communicate with coordinator
 * Phase 19 — Distributed Execution
 */
declare class NodeClient {
    constructor(nodeId: any, coordinatorUrl: any);
    nodeId: any;
    coordinatorUrl: any;
    heartbeatInterval: NodeJS.Timeout;
    /**
     * Start heartbeat
     */
    startHeartbeat(interval?: number): void;
    /**
     * Stop heartbeat
     */
    stopHeartbeat(): void;
    /**
     * Send heartbeat to coordinator
     */
    sendHeartbeat(): Promise<{
        acknowledged: boolean;
    }>;
    /**
     * Acknowledge work receipt
     */
    acknowledgeWork(executionId: any): Promise<{
        execution_id: any;
        acknowledged: boolean;
    }>;
    /**
     * Report execution progress
     */
    reportProgress(executionId: any, progress: any): Promise<{
        execution_id: any;
        progress_recorded: boolean;
    }>;
    /**
     * Report execution result
     */
    reportResult(executionId: any, result: any): Promise<{
        execution_id: any;
        result_received: boolean;
    }>;
    /**
     * Report verification result
     */
    reportVerificationResult(verificationId: any, result: any): Promise<{
        verification_id: any;
        result_received: boolean;
    }>;
    /**
     * Register capabilities
     */
    registerCapabilities(capabilities: any): Promise<{
        capabilities_registered: boolean;
    }>;
    /**
     * Update capabilities
     */
    updateCapabilities(capabilities: any): Promise<{
        capabilities_updated: boolean;
    }>;
}
//# sourceMappingURL=node-client.d.ts.map