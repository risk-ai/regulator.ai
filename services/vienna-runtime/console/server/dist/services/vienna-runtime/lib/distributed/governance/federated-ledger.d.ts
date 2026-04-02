export = FederatedLedger;
declare class FederatedLedger {
    constructor(stateGraph: any);
    stateGraph: any;
    /**
     * Emit federated event
     */
    emitEvent(sourceNodeId: any, eventType: any, executionId: any, metadata?: {}): Promise<string>;
    /**
     * Get events for execution
     */
    getExecutionEvents(executionId: any): Promise<any>;
    /**
     * Get events by node
     */
    getNodeEvents(sourceNodeId: any, filters?: {}): Promise<any>;
    /**
     * Get execution timeline
     */
    getExecutionTimeline(executionId: any): Promise<{
        execution_id: any;
        events: any;
        total: any;
    }>;
    /**
     * Query events
     */
    queryEvents(filters?: {}): Promise<any>;
    _deserializeEvent(row: any): {
        event_id: any;
        source_node_id: any;
        event_type: any;
        execution_id: any;
        timestamp: any;
        metadata: any;
        received_at: any;
    };
    _generateId(prefix: any): string;
}
//# sourceMappingURL=federated-ledger.d.ts.map