/**
 * Server-Sent Events Stream
 *
 * Real-time updates for Vienna Console.
 * All Vienna Core state changes flow through here.
 */
import type { Response } from 'express';
import type { SSEEvent } from '../types/api.js';
export declare class ViennaEventStream {
    private heartbeatIntervalMs;
    private clients;
    private heartbeatInterval;
    constructor(heartbeatIntervalMs?: number);
    /**
     * Start heartbeat mechanism
     */
    start(): void;
    /**
     * Stop heartbeat and cleanup
     */
    stop(): void;
    /**
     * Subscribe a new client
     */
    subscribe(clientId: string, res: Response): void;
    /**
     * Unsubscribe a client
     */
    unsubscribe(clientId: string): void;
    /**
     * Publish event to all clients
     */
    publish<T = unknown>(event: SSEEvent<T>): void;
    /**
     * Send event to specific client
     */
    sendToClient<T = unknown>(clientId: string, event: SSEEvent<T>): void;
    /**
     * Send heartbeat to all clients
     */
    private sendHeartbeat;
    /**
     * Format SSE event
     */
    private formatSSE;
    /**
     * Get connected client count
     */
    getClientCount(): number;
    /**
     * Get client info
     */
    getClients(): Array<{
        id: string;
        connectedAt: Date;
        lastHeartbeat: Date;
    }>;
}
export declare const eventStream: ViennaEventStream;
//# sourceMappingURL=eventStream.d.ts.map