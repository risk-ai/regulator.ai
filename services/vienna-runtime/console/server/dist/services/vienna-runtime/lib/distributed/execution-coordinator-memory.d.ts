export = ExecutionCoordinator;
/**
 * In-Memory Execution Coordinator
 *
 * Lightweight implementation for testing and single-node deployments
 * Phase 19 — Distributed Execution
 */
declare class ExecutionCoordinator {
    constructor(nodeRegistry: any, lockManager: any);
    nodeRegistry: any;
    lockManager: any;
    distributeWork(work: any, options?: {}): Promise<{
        assigned_node: any;
        results: {
            status: string;
            node_id: any;
        }[];
        duration_ms: number;
    }>;
    executeWithLock(work: any, options?: {}): Promise<{
        blocked: boolean;
        reason: string;
    } | {
        lock_acquired: boolean;
        lock_id: any;
        assigned_node: any;
        results: {
            status: string;
            node_id: any;
        }[];
        duration_ms: number;
        blocked?: undefined;
        reason?: undefined;
    }>;
    broadcastWork(work: any): Promise<{
        status: string;
        results: ({
            status: string;
            node_id: any;
            error?: undefined;
        } | {
            status: string;
            error: any;
            node_id: any;
        })[];
        successful_count: number;
        failed_count: number;
        duration_ms: number;
        summary: {
            total_nodes: any;
            successful: number;
            failed: number;
            success_rate: number;
        };
    }>;
    _executeOnNode(nodeId: any, work: any): Promise<{
        status: string;
        node_id: any;
    }>;
}
//# sourceMappingURL=execution-coordinator-memory.d.ts.map