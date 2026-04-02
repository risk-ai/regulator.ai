export class NodeServer {
    constructor(config?: {});
    port: any;
    nodeId: any;
    app: any;
    stateGraph: any;
    executionEngine: PlanExecutionEngine;
    lockManager: any;
    policyEngine: any;
    activeExecutions: Map<any, any>;
    _setupMiddleware(): void;
    _setupRoutes(): void;
    _executeRemotePlan(plan: any, context: any): Promise<{
        success: any;
        result: any;
        error: any;
        duration_ms: number;
    } | {
        success: boolean;
        error: any;
        duration_ms: number;
        result?: undefined;
    }>;
    _cancelExecution(executionId: any, reason: any): Promise<boolean>;
    _getCapabilities(): {
        node_id: any;
        capabilities: {
            max_concurrent: number;
            supported_executors: string[];
            features: string[];
        };
        health: {
            status: string;
            uptime_ms: number;
            queue_depth: number;
            active_executions: number;
        };
    };
    _getHealth(): {
        status: string;
        uptime_ms: number;
        queue_depth: number;
        active_executions: number;
    };
    start(): Promise<any>;
    server: any;
    stop(): Promise<any>;
}
import { PlanExecutionEngine } from "../core/plan-execution-engine";
//# sourceMappingURL=node-server.d.ts.map