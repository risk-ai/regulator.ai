/**
 * Batch Operations API
 * Execute multiple governance operations in a single request
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth } = require('./_auth');
const { query } = require('../../database/client');
const { trackUsage } = require('../../lib/usage');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/batch/, '');

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;

  try {
    // POST /api/v1/batch/intents — submit multiple intents
    if (req.method === 'POST' && path === '/intents') {
      const { intents } = req.body || {};
      
      if (!Array.isArray(intents) || intents.length === 0) {
        return res.status(400).json({ error: 'intents array is required' });
      }

      if (intents.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 intents per batch' });
      }

      const results = [];
      for (const intent of intents) {
        try {
          const result = await query(
            `INSERT INTO execution_events (tenant_id, agent_id, action, payload, event_type, stage)
             VALUES ($1, $2, $3, $4, 'intent_submitted', 'submitted')
             RETURNING event_id, execution_id, event_type, stage, event_timestamp`,
            [tenantId, intent.agent_id, intent.action, JSON.stringify(intent.payload || {})]
          );
          results.push({
            status: 'submitted',
            intent_id: result.rows[0]?.event_id,
            action: intent.action,
          });
        } catch (err) {
          results.push({
            status: 'failed',
            action: intent.action,
            error: err.message,
          });
        }
      }

      // Track batch usage
      trackUsage(tenantId, 'policy_evaluations', intents.length);

      return res.json({
        success: true,
        data: {
          total: intents.length,
          submitted: results.filter(r => r.status === 'submitted').length,
          failed: results.filter(r => r.status === 'failed').length,
          results,
        },
      });
    }

    // POST /api/v1/batch/approvals — bulk approve/deny
    if (req.method === 'POST' && path === '/approvals') {
      const { approval_ids, action: batchAction, reviewer } = req.body || {};

      if (!Array.isArray(approval_ids) || approval_ids.length === 0) {
        return res.status(400).json({ error: 'approval_ids array is required' });
      }

      if (!['approve', 'deny'].includes(batchAction)) {
        return res.status(400).json({ error: 'action must be "approve" or "deny"' });
      }

      if (approval_ids.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 approvals per batch' });
      }

      const newStatus = batchAction === 'approve' ? 'approved' : 'denied';
      const reviewerName = reviewer || user.user_id || 'system';

      const results = [];
      for (const approvalId of approval_ids) {
        try {
          const result = await query(
            `UPDATE approvals 
             SET status = $1, reviewed_by = $2, reviewed_at = NOW()
             WHERE approval_id = $3 AND tenant_id = $4 AND status = 'pending'
             RETURNING approval_id, status`,
            [newStatus, reviewerName, approvalId, tenantId]
          );

          if (result.rowCount === 0) {
            results.push({ approval_id: approvalId, status: 'skipped', reason: 'not found or already processed' });
          } else {
            results.push({ approval_id: approvalId, status: newStatus });
          }
        } catch (err) {
          results.push({ approval_id: approvalId, status: 'failed', error: err.message });
        }
      }

      return res.json({
        success: true,
        data: {
          total: approval_ids.length,
          processed: results.filter(r => r.status === newStatus).length,
          skipped: results.filter(r => r.status === 'skipped').length,
          failed: results.filter(r => r.status === 'failed').length,
          results,
        },
      });
    }

    // POST /api/v1/batch/notifications/read — bulk mark notifications as read
    if (req.method === 'POST' && path === '/notifications/read') {
      const { notification_ids } = req.body || {};

      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        return res.status(400).json({ error: 'notification_ids array is required' });
      }

      const result = await query(
        `UPDATE notifications SET read = true
         WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND read = false
         RETURNING id`,
        [notification_ids, tenantId]
      );

      return res.json({
        success: true,
        data: {
          requested: notification_ids.length,
          updated: result.rowCount,
        },
      });
    }

    return res.status(404).json({ error: 'Batch endpoint not found. Use: /intents, /approvals, /notifications/read' });
  } catch (error) {
    console.error('[Batch API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
