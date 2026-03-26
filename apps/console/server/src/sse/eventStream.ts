/**
 * Server-Sent Events Stream
 * 
 * Real-time updates for Vienna Console.
 * All Vienna Core state changes flow through here.
 */

import type { Response } from 'express';
import type { SSEEvent, SSEEventType } from '../types/api.js';

// Enhanced event types for governance system
export type GovernanceEventType = 
  | 'intent.submitted'
  | 'intent.approved'
  | 'intent.denied'
  | 'warrant.issued'
  | 'warrant.expired' 
  | 'warrant.tampered'
  | 'agent.registered'
  | 'agent.heartbeat'
  | 'agent.trust_changed'
  | 'policy.evaluated'
  | 'policy.conflict'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.scope_drift'
  | 'approval.required'
  | 'approval.resolved'
  | SSEEventType;

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface EnhancedSSEEvent<T = unknown> {
  type: GovernanceEventType;
  timestamp: string;
  data: T;
  tenant_id: string;
  severity: EventSeverity;
}

interface StreamClient {
  id: string;
  response: Response;
  connectedAt: Date;
  lastHeartbeat: Date;
  userId?: string;
  tenantId?: string;
  eventTypeFilters?: string[];
}

export class ViennaEventStream {
  private clients: Map<string, StreamClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private recentEvents: EnhancedSSEEvent[] = [];
  private readonly maxRecentEvents = 100;
  
  constructor(
    private heartbeatIntervalMs: number = 30000 // 30s
  ) {}

  /**
   * Start heartbeat mechanism
   */
  start() {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat and cleanup
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.response.end();
    }
    this.clients.clear();
  }

  /**
   * Subscribe a new client with enhanced filtering
   */
  subscribe(
    clientId: string, 
    res: Response,
    options: {
      userId?: string;
      tenantId?: string;
      eventTypes?: string[];
    } = {}
  ): void {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx compatibility
    
    // Store client with metadata
    this.clients.set(clientId, {
      id: clientId,
      response: res,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      userId: options.userId,
      tenantId: options.tenantId,
      eventTypeFilters: options.eventTypes,
    });

    // Send initial connection event
    this.sendToClient(clientId, {
      type: 'system.status.updated',
      timestamp: new Date().toISOString(),
      payload: { connected: true },
    });

    // Send buffered recent events if client just connected
    if (this.recentEvents.length > 0 && options.tenantId) {
      const filteredEvents = this.recentEvents
        .filter(event => event.tenant_id === options.tenantId)
        .slice(-10); // Last 10 events for catch-up
      
      filteredEvents.forEach(event => {
        if (this.shouldSendEventToClient(clientId, event)) {
          this.sendEnhancedEventToClient(clientId, event);
        }
      });
    }

    // Handle client disconnect
    res.on('close', () => {
      this.unsubscribe(clientId);
    });
  }

  /**
   * Unsubscribe a client
   */
  unsubscribe(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.response.end();
      this.clients.delete(clientId);
    }
  }

  /**
   * Publish enhanced event to all clients with filtering
   */
  publishEnhanced<T = unknown>(event: EnhancedSSEEvent<T>): void {
    // Add to recent events buffer
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }

    // Send to all eligible clients
    for (const client of this.clients.values()) {
      if (this.shouldSendEventToClient(client.id, event)) {
        this.sendEnhancedEventToClient(client.id, event);
      }
    }
  }

  /**
   * Publish legacy event to all clients (backwards compatibility)
   */
  publish<T = unknown>(event: SSEEvent<T>): void {
    const eventData = this.formatSSE(event);
    
    for (const client of this.clients.values()) {
      try {
        client.response.write(eventData);
      } catch (error) {
        console.error(`Failed to send event to client ${client.id}:`, error);
        this.unsubscribe(client.id);
      }
    }
  }

  /**
   * Send event to specific client
   */
  sendToClient<T = unknown>(clientId: string, event: SSEEvent<T>): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const eventData = this.formatSSE(event);
    
    try {
      client.response.write(eventData);
    } catch (error) {
      console.error(`Failed to send event to client ${clientId}:`, error);
      this.unsubscribe(clientId);
    }
  }

  /**
   * Send heartbeat to all clients
   */
  private sendHeartbeat(): void {
    const now = new Date();
    const heartbeat = `:heartbeat ${now.toISOString()}\n\n`;
    
    for (const client of this.clients.values()) {
      try {
        client.response.write(heartbeat);
        client.lastHeartbeat = now;
      } catch (error) {
        console.error(`Failed to send heartbeat to client ${client.id}:`, error);
        this.unsubscribe(client.id);
      }
    }
  }

  /**
   * Format SSE event
   */
  private formatSSE<T>(event: SSEEvent<T>): string {
    const data = JSON.stringify({
      type: event.type,
      timestamp: event.timestamp,
      payload: event.payload,
    });
    
    return `event: ${event.type}\ndata: ${data}\n\n`;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if event should be sent to specific client
   */
  private shouldSendEventToClient(clientId: string, event: EnhancedSSEEvent): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Tenant isolation
    if (client.tenantId && event.tenant_id !== client.tenantId) {
      return false;
    }

    // Event type filtering
    if (client.eventTypeFilters && client.eventTypeFilters.length > 0) {
      if (!client.eventTypeFilters.includes(event.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send enhanced event to specific client
   */
  private sendEnhancedEventToClient(clientId: string, event: EnhancedSSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const eventData = this.formatEnhancedSSE(event);
    
    try {
      client.response.write(eventData);
    } catch (error) {
      console.error(`Failed to send enhanced event to client ${clientId}:`, error);
      this.unsubscribe(clientId);
    }
  }

  /**
   * Format enhanced SSE event
   */
  private formatEnhancedSSE<T>(event: EnhancedSSEEvent<T>): string {
    const data = JSON.stringify({
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
      tenant_id: event.tenant_id,
      severity: event.severity,
    });
    
    return `event: ${event.type}\ndata: ${data}\n\n`;
  }

  /**
   * Get recent events (for debugging or catch-up)
   */
  getRecentEvents(tenantId?: string, limit: number = 50): EnhancedSSEEvent[] {
    let events = this.recentEvents;
    
    if (tenantId) {
      events = events.filter(event => event.tenant_id === tenantId);
    }
    
    return events.slice(-limit);
  }

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
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
      userId: client.userId,
      tenantId: client.tenantId,
      eventFilters: client.eventTypeFilters,
    }));
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<EventSeverity, number>;
    connectedClients: number;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<EventSeverity, number> = { info: 0, warning: 0, critical: 0 };

    this.recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.recentEvents.length,
      eventsByType,
      eventsBySeverity,
      connectedClients: this.clients.size,
    };
  }
}

// Singleton instance
export const eventStream = new ViennaEventStream();
