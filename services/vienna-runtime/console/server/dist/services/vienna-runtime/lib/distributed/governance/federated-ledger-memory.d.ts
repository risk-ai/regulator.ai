export = FederatedLedger;
declare class FederatedLedger {
    constructor(localLedger: any, nodeClient: any);
    localLedger: any;
    nodeClient: any;
    vectorClock: {};
    lastSyncPosition: {};
    _createInMemoryLedger(): {
        writeEvent: (event: any) => Promise<{
            event_id: any;
        }>;
        queryEvents: (filters?: {}) => Promise<any[]>;
        getEvent: (eventId: any) => Promise<any>;
        _events: Map<any, any>;
    };
    recordEvent(event: any, options?: {}): Promise<{
        duplicate: boolean;
        event_id: any;
        recorded?: undefined;
        broadcasted?: undefined;
        peer_count?: undefined;
        broadcast_failures?: undefined;
    } | {
        recorded: boolean;
        event_id: any;
        broadcasted: boolean;
        peer_count: any;
        broadcast_failures: {
            peer: any;
            error: any;
        }[];
        duplicate?: undefined;
    } | {
        recorded: boolean;
        event_id: any;
        duplicate?: undefined;
        broadcasted?: undefined;
        peer_count?: undefined;
        broadcast_failures?: undefined;
    }>;
    _broadcastToPeer(peer: any, event: any): Promise<void>;
    queryEvents(filters?: {}, options?: {}): Promise<any>;
    detectConsistencyGaps(nodeId: any): Promise<{
        event_id: any;
        missing_sequence: any;
    }[]>;
    reconcileEvents(reconciliation: any): Promise<{
        reconciled_count: number;
    }>;
    validateEventChain(): Promise<{
        valid: boolean;
        corrupted_at: any;
        chain_length: any;
    } | {
        valid: boolean;
        chain_length: any;
        corrupted_at?: undefined;
    }>;
    compareWithNode(nodeId: any): Promise<{
        consistent: boolean;
        local_count: any;
        remote_count: any;
    }>;
    _calculateChecksum(events: any): string;
    deleteEvent(eventId: any, options?: {}): Promise<{
        tombstoned: boolean;
        event_id: any;
        broadcasted: boolean;
    }>;
    compactTombstones(options?: {}): Promise<{
        compacted_count: number;
    }>;
    syncWithNode(nodeId: any, callback: any, options?: {}): Promise<{
        sync_complete: boolean;
        sync_interrupted?: undefined;
        error?: undefined;
    } | {
        sync_interrupted: boolean;
        error: any;
        sync_complete?: undefined;
    }>;
    _setLastSyncedPosition(nodeId: any, position: any): void;
}
//# sourceMappingURL=federated-ledger-memory.d.ts.map