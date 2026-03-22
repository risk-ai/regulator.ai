/**
 * Server-Sent Events Stream
 * 
 * Real-time updates for Vienna Console.
 * All Vienna Core state changes flow through here.
 */

import type { Response } from 'express';
import type { SSEEvent, SSEEventType } from '../types/api.js';

interface StreamClient {
  id: string;
  response: Response;
  connectedAt: Date;
  lastHeartbeat: Date;
}

export class ViennaEventStream {
  private clients: Map<string, StreamClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
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
   * Subscribe a new client
   */
  subscribe(clientId: string, res: Response): void {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // nginx compatibility
    
    // Store client
    this.clients.set(clientId, {
      id: clientId,
      response: res,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    });

    // Send initial connection event
    this.sendToClient(clientId, {
      type: 'system.status.updated',
      timestamp: new Date().toISOString(),
      payload: { connected: true },
    });

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
   * Publish event to all clients
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
   * Get client info
   */
  getClients(): Array<{ id: string; connectedAt: Date; lastHeartbeat: Date }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      lastHeartbeat: client.lastHeartbeat,
    }));
  }
}

// Singleton instance
export const eventStream = new ViennaEventStream();
