export = RemoteDispatcher;
/**
 * In-Memory Remote Dispatcher
 *
 * Lightweight implementation for testing and single-node deployments
 * Phase 19.1 — Remote Execution
 */
declare class RemoteDispatcher {
    constructor(nodeClient: any);
    nodeClient: any;
    dispatchLog: any[];
    capabilityCache: Map<any, any>;
    fallbackHandler: any;
    dispatchPlan(dispatch: any, options?: {}): Promise<{
        dispatched: boolean;
        reason: string;
        dispatch_duration_ms?: undefined;
        execution_id?: undefined;
        fallback_executed?: undefined;
        error?: undefined;
        recovery_suggestions?: undefined;
    } | {
        dispatched: boolean;
        reason: any;
        dispatch_duration_ms: number;
        execution_id?: undefined;
        fallback_executed?: undefined;
        error?: undefined;
        recovery_suggestions?: undefined;
    } | {
        dispatched: boolean;
        execution_id: any;
        dispatch_duration_ms: number;
        reason?: undefined;
        fallback_executed?: undefined;
        error?: undefined;
        recovery_suggestions?: undefined;
    } | {
        dispatched: boolean;
        fallback_executed: boolean;
        execution_id: any;
        reason?: undefined;
        dispatch_duration_ms?: undefined;
        error?: undefined;
        recovery_suggestions?: undefined;
    } | {
        dispatched: boolean;
        error: any;
        fallback_executed: boolean;
        recovery_suggestions: string[];
        dispatch_duration_ms: number;
        reason?: undefined;
        execution_id?: undefined;
    }>;
    streamRemoteExecution(nodeId: any, executionId: any, callback: any, options?: {}): Promise<{
        stream_closed: boolean;
        stream_interrupted?: undefined;
        error?: undefined;
    } | {
        stream_interrupted: boolean;
        error: any;
        stream_closed?: undefined;
    }>;
    negotiateCapabilities(nodeId: any): Promise<any>;
    setFallbackHandler(handler: any): void;
    getDispatchLog(): any[];
    _clearCapabilityCache(): void;
    _isTransientError(error: any): any;
}
//# sourceMappingURL=remote-dispatcher-memory.d.ts.map