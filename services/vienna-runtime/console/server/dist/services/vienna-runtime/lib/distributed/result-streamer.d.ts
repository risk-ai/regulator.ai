export = ResultStreamer;
declare class ResultStreamer {
    constructor(stateGraph: any, executionCoordinator: any);
    stateGraph: any;
    executionCoordinator: any;
    progressHandlers: Map<any, any>;
    /**
     * Register progress handler
     */
    registerProgressHandler(executionId: any, handler: any): void;
    /**
     * Unregister progress handler
     */
    unregisterProgressHandler(executionId: any): void;
    /**
     * Handle progress event from node
     */
    handleProgressEvent(event: any): Promise<{
        received: boolean;
    }>;
    /**
     * Handle execution result from node
     */
    handleExecutionResult(executionId: any, nodeId: any, result: any): Promise<{
        received: boolean;
    }>;
    /**
     * Poll node for status
     */
    pollNodeStatus(nodeId: any, executionId: any): Promise<{
        execution_id: any;
        status: string;
        current_step: number;
        progress_pct: number;
    }>;
    /**
     * Set up webhook endpoint for progress updates
     */
    setupWebhook(coordinatorUrl: any): {
        webhook_url: string;
        configured: boolean;
    };
    _updateCoordinationProgress(executionId: any, updates: any): Promise<void>;
    _emitProgressEvent(executionId: any, nodeId: any, eventType: any, metadata: any): Promise<string>;
    _generateId(prefix: any): string;
}
//# sourceMappingURL=result-streamer.d.ts.map