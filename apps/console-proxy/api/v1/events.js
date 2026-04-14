/**
 * Server-Sent Events (SSE) Endpoint
 * Real-time governance event streaming to console clients
 * 
 * Usage:
 *   const eventSource = new EventSource('/api/v1/events');
 *   eventSource.onmessage = (event) => console.log(JSON.parse(event.data));
 */

const { requireAuth } = require('./_auth');
const { captureException } = require('../../lib/sentry');

// Store active SSE connections per tenant
const connections = new Map();

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  const tenantId = user.tenant_id;
  const connectionId = `${tenantId}:${Date.now()}:${Math.random()}`;

  // Store connection
  if (!connections.has(tenantId)) {
    connections.set(tenantId, new Set());
  }
  connections.get(tenantId).add({ id: connectionId, res, user });

  console.log(`[SSE] Client connected: ${connectionId} (tenant: ${tenantId})`);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    connection_id: connectionId
  })}\n\n`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    const tenantConns = connections.get(tenantId);
    if (tenantConns) {
      tenantConns.forEach(conn => {
        if (conn.id === connectionId) {
          tenantConns.delete(conn);
        }
      });
      if (tenantConns.size === 0) {
        connections.delete(tenantId);
      }
    }
    console.log(`[SSE] Client disconnected: ${connectionId}`);
  });
};

/**
 * Broadcast event to all connected clients for a tenant
 * 
 * @param {string} tenantId - Tenant ID
 * @param {object} event - Event data
 * 
 * Example usage from other API endpoints:
 *   const { broadcastEvent } = require('./events');
 *   broadcastEvent(tenantId, {
 *     type: 'approval_required',
 *     data: { approval_id, intent_id, agent_id }
 *   });
 */
function broadcastEvent(tenantId, event) {
  const tenantConns = connections.get(tenantId);
  if (!tenantConns || tenantConns.size === 0) {
    return; // No clients connected
  }

  const message = `data: ${JSON.stringify({
    ...event,
    timestamp: new Date().toISOString()
  })}\n\n`;

  let sent = 0;
  let failed = 0;

  tenantConns.forEach(conn => {
    try {
      conn.res.write(message);
      sent++;
    } catch (error) {
      failed++;
      tenantConns.delete(conn);
    }
  });

  console.log(`[SSE] Broadcast to ${tenantId}: ${sent} sent, ${failed} failed`);
}

/**
 * Get count of active SSE connections
 */
function getConnectionCount() {
  let total = 0;
  connections.forEach(conns => total += conns.size);
  return total;
}

/**
 * Get connection stats per tenant
 */
function getConnectionStats() {
  const stats = {};
  connections.forEach((conns, tenantId) => {
    stats[tenantId] = conns.size;
  });
  return stats;
}

module.exports.broadcastEvent = broadcastEvent;
module.exports.getConnectionCount = getConnectionCount;
module.exports.getConnectionStats = getConnectionStats;
