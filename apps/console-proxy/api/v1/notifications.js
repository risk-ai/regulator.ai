/**
 * Notifications API
 * TENANT-ISOLATED: All queries filter by tenant_id
 */

const { requireAuth } = require('./_auth');
const { query } = require('../../database/client');

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1\/notifications/, '');
  const queryParams = Object.fromEntries(url.searchParams);

  const user = await requireAuth(req, res);
  if (!user) return;
  const tenantId = user.tenant_id;
  const userId = user.user_id;

  try {
    // List notifications
    if (req.method === 'GET' && (!path || path === '' || path === '/')) {
      const readStatus = queryParams.read; // 'true', 'false', or undefined (all)
      const type = queryParams.type;
      const limit = Math.min(parseInt(queryParams.limit || '50'), 100);
      const offset = parseInt(queryParams.offset || '0');

      let queryStr = `
        SELECT * FROM notifications
        WHERE tenant_id = $1
      `;
      const values = [tenantId];

      // Filter by read status
      if (readStatus === 'true') {
        queryStr += ` AND read = true`;
      } else if (readStatus === 'false') {
        queryStr += ` AND read = false`;
      }

      // Filter by type
      if (type) {
        values.push(type);
        queryStr += ` AND type = $${values.length}`;
      }

      // Filter by user (only show user-specific + tenant-wide notifications)
      if (userId) {
        queryStr += ` AND (user_id = '${userId}' OR user_id IS NULL)`;
      } else {
        queryStr += ` AND user_id IS NULL`;
      }

      queryStr += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const result = await query(queryStr, values);

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          limit,
          offset,
          hasMore: result.rows.length === limit
        }
      });
    }

    // Get unread count
    if (req.method === 'GET' && path === '/unread-count') {
      let queryStr = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE tenant_id = $1 AND read = false
      `;
      const values = [tenantId];

      // Filter by user
      if (userId) {
        queryStr += ` AND (user_id = '${userId}' OR user_id IS NULL)`;
      } else {
        queryStr += ` AND user_id IS NULL`;
      }

      const result = await query(queryStr, values);

      return res.json({
        success: true,
        data: {
          unreadCount: parseInt(result.rows[0].count)
        }
      });
    }

    // Mark notification as read
    if (req.method === 'PATCH' && path.match(/^\/[a-f0-9-]+\/read$/)) {
      const notificationId = path.split('/')[1];

      let queryStr = `
        UPDATE notifications
        SET read = true
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [notificationId, tenantId];

      // User can only mark their own notifications or tenant-wide ones as read
      if (userId) {
        queryStr += ` AND (user_id = '${userId}' OR user_id IS NULL)`;
      } else {
        queryStr += ` AND user_id IS NULL`;
      }

      queryStr += ` RETURNING *`;

      const result = await query(queryStr, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found or access denied'
        });
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });
    }

    // Mark all notifications as read
    if (req.method === 'POST' && path === '/mark-all-read') {
      let queryStr = `
        UPDATE notifications
        SET read = true
        WHERE tenant_id = $1 AND read = false
      `;
      const values = [tenantId];

      // User can only mark their own notifications or tenant-wide ones as read
      if (userId) {
        queryStr += ` AND (user_id = '${userId}' OR user_id IS NULL)`;
      } else {
        queryStr += ` AND user_id IS NULL`;
      }

      queryStr += ` RETURNING COUNT(*)`;

      const result = await query(queryStr, values);

      return res.json({
        success: true,
        data: {
          markedCount: result.rowCount || 0
        }
      });
    }

    // Delete notification
    if (req.method === 'DELETE' && path.match(/^\/[a-f0-9-]+$/)) {
      const notificationId = path.substring(1);

      let queryStr = `
        DELETE FROM notifications
        WHERE id = $1 AND tenant_id = $2
      `;
      const values = [notificationId, tenantId];

      // User can only delete their own notifications or tenant-wide ones
      if (userId) {
        queryStr += ` AND (user_id = '${userId}' OR user_id IS NULL)`;
      } else {
        queryStr += ` AND user_id IS NULL`;
      }

      queryStr += ` RETURNING *`;

      const result = await query(queryStr, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found or access denied'
        });
      }

      return res.json({
        success: true,
        data: { deleted: true }
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Not found'
    });

  } catch (error) {
    console.error('[notifications]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: 'NOTIFICATION_ERROR'
    });
  }
};