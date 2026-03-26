/**
 * SSE Client Handler
 * 
 * Handles GET /api/v1/events/stream endpoint with tenant isolation
 * and event type filtering.
 */

import type { Request, Response } from 'express';
import { eventStream } from './eventStream.js';
import { v4 as uuidv4 } from 'uuid';

export interface SSEConnectionRequest extends Request {
  query: {
    types?: string; // Comma-separated event types
    tenant_id?: string;
  };
  user?: {
    id: string;
    tenant_id?: string;
  };
}

/**
 * Handle SSE connection with filtering and tenant isolation
 */
export function handleSSEConnection(req: SSEConnectionRequest, res: Response) {
  const clientId = uuidv4();
  const userId = req.user?.id;
  const tenantId = req.query.tenant_id || req.user?.tenant_id;
  
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: 'tenant_id is required'
    });
  }

  // Parse event type filters
  const eventTypesParam = req.query.types;
  const eventTypes = eventTypesParam 
    ? eventTypesParam.split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  console.log(`[SSE] Client ${clientId} connecting - tenant: ${tenantId}, user: ${userId}, filters: ${eventTypes?.join(',') || 'all'}`);

  // Setup connection with filters
  try {
    eventStream.subscribe(clientId, res, {
      userId,
      tenantId,
      eventTypes,
    });

    console.log(`[SSE] Client ${clientId} connected successfully`);
  } catch (error) {
    console.error(`[SSE] Failed to setup connection for client ${clientId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to establish SSE connection'
    });
  }
}

/**
 * Get SSE stream statistics (for monitoring)
 */
export function getSSEStats(req: Request, res: Response) {
  try {
    const stats = eventStream.getEventStats();
    const clients = eventStream.getClients();

    res.json({
      success: true,
      data: {
        ...stats,
        clients: clients.map(client => ({
          id: client.id,
          connectedAt: client.connectedAt,
          lastHeartbeat: client.lastHeartbeat,
          tenantId: client.tenantId,
          eventFilters: client.eventFilters,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SSE] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SSE statistics',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get recent events for debugging/testing
 */
export function getRecentEvents(req: Request, res: Response) {
  try {
    const tenantId = req.query.tenant_id as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id is required'
      });
    }

    const events = eventStream.getRecentEvents(tenantId, limit);

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
        tenant_id: tenantId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SSE] Error getting recent events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent events',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Test event emission (for development/testing)
 */
export function emitTestEvent(req: Request, res: Response) {
  try {
    const { type, data, tenant_id, severity } = req.body;

    if (!type || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'type and tenant_id are required'
      });
    }

    eventStream.publishEnhanced({
      type,
      timestamp: new Date().toISOString(),
      data: data || { test: true, message: 'Test event' },
      tenant_id,
      severity: severity || 'info',
    });

    res.json({
      success: true,
      message: 'Test event emitted',
      event: { type, tenant_id, severity },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SSE] Error emitting test event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to emit test event',
      timestamp: new Date().toISOString(),
    });
  }
}