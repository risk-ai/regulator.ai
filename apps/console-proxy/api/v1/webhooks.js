/**
 * Webhooks System
 * Register webhooks and deliver events
 */

const { requireAuth, pool } = require('./_auth');
const crypto = require('crypto');

// Webhook event queue (in-memory for now, should be Redis/SQS in production)
const eventQueue = [];
let processingInterval = null;

// Generate webhook signature
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Deliver webhook event
async function deliverWebhook(webhook, event) {
  const payload = {
    id: crypto.randomUUID(),
    event: event.type,
    data: event.data,
    timestamp: new Date().toISOString()
  };
  
  const signature = generateSignature(payload, webhook.secret);
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Vienna-Signature': signature,
        'X-Vienna-Event': event.type,
        'User-Agent': 'Vienna-Webhooks/1.0'
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });
    
    // Log delivery
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status_code, delivered_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [webhook.id, event.type, JSON.stringify(payload), response.status]
    );
    
    return {
      success: response.ok,
      status: response.status
    };
  } catch (error) {
    // Log failed delivery
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status_code, error_message, delivered_at)
       VALUES ($1, $2, $3, 0, $4, NOW())`,
      [webhook.id, event.type, JSON.stringify(payload), error.message]
    );
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Process event queue
async function processEventQueue() {
  if (eventQueue.length === 0) return;
  
  const event = eventQueue.shift();
  
  // Get active webhooks for this event type
  const webhooks = await pool.query(
    'SELECT * FROM webhooks WHERE enabled = true AND events @> $1',
    [[event.type]]
  );
  
  // Deliver to all matching webhooks
  for (const webhook of webhooks.rows) {
    await deliverWebhook(webhook, event);
  }
}

// Start processing queue
function startQueueProcessor() {
  if (!processingInterval) {
    processingInterval = setInterval(processEventQueue, 1000); // Process every second
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/webhooks/, '');
  const params = Object.fromEntries(url.searchParams);

  // Auth required
  const user = requireAuth(req, res);
  if (!user) return; // 401 already sent
  const tenantId = user.tenant_id;
  
  try {
    // List webhooks
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const webhooks = await pool.query(
        'SELECT id, url, events, enabled, created_at FROM webhooks WHERE tenant_id = $1 ORDER BY created_at DESC',
        ['default'] // Replace with actual tenant from auth
      );
      
      return res.json({
        success: true,
        data: webhooks.rows
      });
    }
    
    // Create webhook
    if (req.method === 'POST' && (!path || path === '' || path === '/')) {
      const { url: webhookUrl, events, enabled = true } = req.body;
      
      if (!webhookUrl || !events || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'url and events required'
        });
      }
      
      const webhookId = crypto.randomUUID();
      const secret = crypto.randomBytes(32).toString('hex');
      
      await pool.query(
        `INSERT INTO webhooks (id, tenant_id, url, events, secret, enabled, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [webhookId, 'default', webhookUrl, JSON.stringify(events), secret, enabled]
      );
      
      // Start queue processor
      startQueueProcessor();
      
      return res.json({
        success: true,
        data: {
          id: webhookId,
          url: webhookUrl,
          events,
          secret, // Only shown once!
          warning: 'Store the secret securely. Use it to verify webhook signatures.'
        }
      });
    }
    
    // Update webhook
    if (req.method === 'PUT' && path.startsWith('/')) {
      const webhookId = path.substring(1);
      const { url: webhookUrl, events, enabled } = req.body;
      
      const updates = [];
      const values = [];
      
      if (webhookUrl) {
        values.push(webhookUrl);
        updates.push(`url = $${values.length}`);
      }
      if (events) {
        values.push(JSON.stringify(events));
        updates.push(`events = $${values.length}`);
      }
      if (enabled !== undefined) {
        values.push(enabled);
        updates.push(`enabled = $${values.length}`);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      values.push(webhookId);
      await pool.query(
        `UPDATE webhooks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
        values
      );
      
      return res.json({
        success: true,
        data: { id: webhookId }
      });
    }
    
    // Delete webhook
    if (req.method === 'DELETE' && path.startsWith('/')) {
      const webhookId = path.substring(1);
      
      await pool.query(
        'DELETE FROM webhooks WHERE id = $1',
        [webhookId]
      );
      
      return res.json({
        success: true,
        data: { id: webhookId, deleted: true }
      });
    }
    
    // Test webhook
    if (req.method === 'POST' && path.endsWith('/test')) {
      const webhookId = path.split('/')[1];
      
      const webhook = await pool.query(
        'SELECT * FROM webhooks WHERE id = $1',
        [webhookId]
      );
      
      if (webhook.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found'
        });
      }
      
      // Send test event
      const result = await deliverWebhook(webhook.rows[0], {
        type: 'test',
        data: { message: 'This is a test webhook event' }
      });
      
      return res.json({
        success: true,
        data: result
      });
    }
    
    // Get webhook deliveries
    if (req.method === 'GET' && path.includes('/deliveries')) {
      const webhookId = path.split('/')[1];
      const limit = parseInt(params.limit || '50', 10);
      
      const deliveries = await pool.query(
        `SELECT event_type, status_code, error_message, delivered_at 
         FROM webhook_deliveries 
         WHERE webhook_id = $1 
         ORDER BY delivered_at DESC 
         LIMIT $2`,
        [webhookId, limit]
      );
      
      return res.json({
        success: true,
        data: deliveries.rows
      });
    }
    
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
    
  } catch (error) {
    console.error('[webhooks]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'WEBHOOK_ERROR'
    });
  }
};

// Export queue function for other modules to use
module.exports.queueEvent = function(eventType, data) {
  eventQueue.push({
    type: eventType,
    data
  });
  
  // Start processor if not running
  startQueueProcessor();
};
