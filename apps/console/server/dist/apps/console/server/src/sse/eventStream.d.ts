/**
 * Server-Sent Events Stream
 *
 * Real-time updates for Vienna Console.
 * All Vienna Core state changes flow through here.
 */
import type { Response } from 'express';
import type { SSEEvent, SSEEventType } from '../types/api.js';
export type GovernanceEventType = 'intent.submitted' | 'intent.approved' | 'intent.denied' | 'warrant.issued' | 'warrant.expired' | 'warrant.tampered' | 'agent.registered' | 'agent.heartbeat' | 'agent.trust_changed' | 'policy.evaluated' | 'policy.conflict' | 'execution.started' | 'execution.completed' | 'execution.scope_drift' | 'approval.required' | 'approval.resolved' | SSEEventType;
export type EventSeverity = 'info' | 'warning' | 'critical';
export interface EnhancedSSEEvent<T = unknown> {
    type: GovernanceEventType;
    timestamp: string;
    data: T;
    tenant_id: string;
    severity: EventSeverity;
}
export declare class ViennaEventStream {
    private heartbeatIntervalMs;
    private clients;
    private heartbeatInterval;
    private recentEvents;
    private readonly maxRecentEvents;
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
     * Subscribe a new client with enhanced filtering
     */
    subscribe(clientId: string, res: Response, options?: {
        userId?: string;
        tenantId?: string;
        eventTypes?: string[];
    }): void;
    /**
     * Unsubscribe a client
     */
    unsubscribe(clientId: string): void;
    /**
     * Publish enhanced event to all clients with filtering
     */
    publishEnhanced<T = unknown>(event: EnhancedSSEEvent<T>): void;
    /**
     * Publish legacy event to all clients (backwards compatibility)
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
     * Check if event should be sent to specific client
     */
    private shouldSendEventToClient;
    /**
     * Send enhanced event to specific client
     */
    private sendEnhancedEventToClient;
    /**
     * Format enhanced SSE event
     */
    private formatEnhancedSSE;
    /**
     * Get recent events (for debugging or catch-up)
     */
    getRecentEvents(tenantId?: string, limit?: number): EnhancedSSEEvent[];
    /**
     * Get enhanced client info
     */
    getClients(): Array<{
        id: string;
        connectedAt: Date;
        lastHeartbeat: Date;
        userId?: string;
        tenantId?: string;
        eventFilters?: string[];
    }>;
    /**
     * Get event statistics
     */
    getEventStats(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<EventSeverity, number>;
        connectedClients: number;
    };
}
export declare const eventStream: ViennaEventStream;
//# sourceMappingURL=eventStream.d.ts.map