/**
 * Real-time Event Stream (SSE)
 * Push live updates for executions, approvals, and warrants
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Store active connections
const connections = new Set();

// Poll database for new events
let lastEventTime = new Date();
let pollInterval = null;

async function pollForEvents() {
  try {
    const result = await pool.query(
      `SELECT 
        e.event_id,
        e.execution_id,
        e.event_type,
        e.stage,
        e.event_timestamp,
        a.approval_id,
        a.required_tier,
        a.status as approval_status
      FROM execution_ledger_events e
      LEFT JOIN approval_requests a ON a.execution_id = e.execution_id
      WHERE e.event_timestamp > $1
      ORDER BY e.event_timestamp ASC
      LIMIT 100`,
      [lastEventTime]
    );
    
    if (result.rows.length > 0) {
      // Update last event time
      lastEventTime = new Date(result.rows[result.rows.length - 1].event_timestamp);
      
      // Broadcast to all connected clients
      const events = result.rows.map(row => ({
        type: row.event_type,
        execution_id: row.execution_id,
        stage: row.stage,
        timestamp: row.event_timestamp,
        approval: row.approval_id ? {
          id: row.approval_id,
          tier: row.required_tier,
          status: row.approval_status
        } : null
      }));
      
      for (const conn of connections) {
        try {
          for (const event of events) {
            conn.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (err) {
          connections.delete(conn);
        }
      }
    }
  } catch (error) {
    console.error('[events-poll]', error);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  
  // Add this connection to the set
  connections.add(res);
  
  // Start polling if not already running
  if (!pollInterval) {
    pollInterval = setInterval(pollForEvents, 2000); // Poll every 2 seconds
  }
  
  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeat);
      connections.delete(res);
    }
  }, 30000);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    connections.delete(res);
    
    // Stop polling if no connections
    if (connections.size === 0 && pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  });
};
