/**
 * Notification Generator Utility
 * Creates notifications for various system events
 */

const { query } = require('../database/client');

/**
 * Create a new notification
 * @param {string} tenantId - Tenant ID (required)
 * @param {Object} options - Notification options
 * @param {string} options.userId - User ID (optional, null for tenant-wide notifications)
 * @param {string} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.metadata - Additional metadata (optional)
 * @returns {Promise<Object>} Created notification record
 */
async function createNotification(tenantId, { userId, type, title, message, metadata = {} }) {
  if (!tenantId || !type || !title || !message) {
    throw new Error('tenantId, type, title, and message are required');
  }

  // Validate notification type
  const validTypes = [
    'approval_required',
    'approval_granted', 
    'approval_denied',
    'warrant_issued',
    'warrant_expired',
    'execution_failed',
    'system',
    'billing'
  ];

  if (!validTypes.includes(type)) {
    throw new Error(`Invalid notification type: ${type}. Valid types: ${validTypes.join(', ')}`);
  }

  try {
    const result = await query(
      `INSERT INTO notifications (tenant_id, user_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, userId || null, type, title, message, JSON.stringify(metadata)]
    );

    console.log(`[notifications] Created notification: ${type} for tenant ${tenantId}`);
    return result.rows[0];
  } catch (error) {
    console.error('[notifications] Failed to create notification:', error);
    throw error;
  }
}

/**
 * Create approval-related notifications
 */
async function notifyApprovalRequired(tenantId, { approvalId, requiredTier, description, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'approval_required',
    title: `Approval Required (${requiredTier})`,
    message: description || 'An action requires approval before execution',
    metadata: { approvalId, requiredTier }
  });
}

async function notifyApprovalGranted(tenantId, { approvalId, reviewer, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'approval_granted',
    title: 'Approval Granted',
    message: `Your request has been approved by ${reviewer}`,
    metadata: { approvalId, reviewer }
  });
}

async function notifyApprovalDenied(tenantId, { approvalId, reviewer, reason, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'approval_denied',
    title: 'Approval Denied',
    message: `Your request was denied by ${reviewer}: ${reason}`,
    metadata: { approvalId, reviewer, reason }
  });
}

/**
 * Create warrant-related notifications
 */
async function notifyWarrantIssued(tenantId, { warrantId, warrantType, description, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'warrant_issued',
    title: `Warrant Issued: ${warrantType}`,
    message: description || 'A new warrant has been issued for your tenant',
    metadata: { warrantId, warrantType }
  });
}

async function notifyWarrantExpired(tenantId, { warrantId, warrantType, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'warrant_expired',
    title: `Warrant Expired: ${warrantType}`,
    message: 'A warrant has expired and may need renewal',
    metadata: { warrantId, warrantType }
  });
}

/**
 * Create execution-related notifications
 */
async function notifyExecutionFailed(tenantId, { executionId, stage, error, userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'execution_failed',
    title: 'Execution Failed',
    message: `Execution ${executionId} failed at ${stage}: ${error}`,
    metadata: { executionId, stage, error }
  });
}

/**
 * Create system notifications
 */
async function notifySystemAlert(tenantId, { title, message, severity = 'info', userId = null }) {
  return createNotification(tenantId, {
    userId,
    type: 'system',
    title: title,
    message: message,
    metadata: { severity }
  });
}

module.exports = {
  createNotification,
  notifyApprovalRequired,
  notifyApprovalGranted,
  notifyApprovalDenied,
  notifyWarrantIssued,
  notifyWarrantExpired,
  notifyExecutionFailed,
  notifySystemAlert
};