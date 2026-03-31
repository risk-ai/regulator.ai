/**
 * Webhook Delivery System
 * Delivers events to registered webhooks with retry logic
 */

const crypto = require('crypto');
const { pool } = require('../database/client');

/**
 * Deliver event to all registered webhooks
 * @param {string} eventType - Type of event (e.g., 'execution.completed')
 * @param {object} payload - Event data
 * @param {string} tenantId - Tenant ID for isolation
 */
async function deliverWebhook(eventType, payload, tenantId) {
  try {
    // Find webhooks for this event type and tenant
    const webhooks = await pool.query(
      `SELECT * FROM webhooks 
       WHERE tenant_id = $1 
         AND enabled = true 
         AND $2 = ANY(events)`,
      [tenantId, eventType]
    );
    
    if (webhooks.rows.length === 0) {
      return; // No webhooks registered
    }
    
    // Deliver to each webhook
    for (const webhook of webhooks.rows) {
      await deliverToWebhook(webhook, eventType, payload);
    }
  } catch (error) {
    console.error('[webhook-delivery] Error:', error);
  }
}

/**
 * Deliver to a single webhook with retry logic
 */
async function deliverToWebhook(webhook, eventType, payload) {
  const deliveryId = `wh_delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const deliveryPayload = {
    id: deliveryId,
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  };
  
  // Generate HMAC signature
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(deliveryPayload))
    .digest('hex');
  
  let attempt = 0;
  let delivered = false;
  let lastError = null;
  
  // Retry up to 3 times
  while (attempt < 3 && !delivered) {
    attempt++;
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Delivery': deliveryId,
          'User-Agent': 'Vienna-OS-Webhooks/1.0'
        },
        body: JSON.stringify(deliveryPayload),
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        delivered = true;
        
        // Log successful delivery
        await pool.query(
          `INSERT INTO webhook_deliveries 
           (id, webhook_id, event_type, payload, response_status, delivered_at, attempts)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [deliveryId, webhook.id, eventType, deliveryPayload, response.status, attempt]
        );
        
        console.log(`[webhook-delivery] Delivered ${eventType} to ${webhook.url} (attempt ${attempt})`);
      } else {
        lastError = `HTTP ${response.status}: ${await response.text()}`;
      }
    } catch (error) {
      lastError = error.message;
      
      if (attempt < 3) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  // Log failed delivery if all attempts exhausted
  if (!delivered) {
    await pool.query(
      `INSERT INTO webhook_deliveries 
       (id, webhook_id, event_type, payload, error, attempts, failed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [deliveryId, webhook.id, eventType, deliveryPayload, lastError, attempt]
    );
    
    console.error(`[webhook-delivery] Failed to deliver ${eventType} to ${webhook.url} after ${attempt} attempts: ${lastError}`);
  }
}

/**
 * Hook into execution pipeline
 * Call this from Vienna Core when events occur
 */
function setupWebhookHooks() {
  // This would be called from Vienna Core execution logic
  // Example events:
  // - execution.requested
  // - execution.approved
  // - execution.rejected
  // - execution.completed
  // - execution.failed
  // - warrant.issued
  // - warrant.verified
  // - approval.required
  
  // Implementation would depend on where events are currently emitted
}

module.exports = {
  deliverWebhook,
  deliverToWebhook,
  setupWebhookHooks
};
