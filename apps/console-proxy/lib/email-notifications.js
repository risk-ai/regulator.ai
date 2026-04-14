/**
 * Email Notifications Service
 * Sends governance event notifications via SMTP
 * 
 * Supports: Gmail, SendGrid, AWS SES, generic SMTP
 */

const nodemailer = require('nodemailer');
const { captureException } = require('./sentry');

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  transporter = nodemailer.createTransporter(config);
  return transporter;
}

/**
 * Send email notification for governance event
 * 
 * @param {object} options
 * @param {string[]} options.recipients - Email addresses
 * @param {string} options.eventType - Event type (approval_required, action_executed, etc.)
 * @param {object} options.data - Event data
 * @param {string} options.tenantId - Tenant ID
 */
async function sendEventNotification({ recipients, eventType, data, tenantId }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP not configured, skipping notification');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const subject = formatSubject(eventType, data);
    const html = formatEmailBody(eventType, data, tenantId);

    const mailOptions = {
      from: `"Vienna OS" <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject,
      html,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log('[Email] Sent:', info.messageId);

    return { success: true, messageId: info.messageId };

  } catch (error) {
    captureException(error, { tags: { service: 'email' } });
    console.error('[Email] Send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format email subject line
 */
function formatSubject(eventType, data) {
  const prefix = process.env.EMAIL_SUBJECT_PREFIX || '[Vienna]';
  
  const subjects = {
    approval_required: `${prefix} Approval Required - ${data.agent_id}`,
    approval_resolved: `${prefix} Approval ${data.result} - ${data.agent_id}`,
    action_executed: `${prefix} Action Executed - ${data.agent_id}`,
    action_failed: `${prefix} Action Failed - ${data.agent_id}`,
    policy_violation: `${prefix} Policy Violation - ${data.agent_id}`,
    warrant_issued: `${prefix} Warrant Issued - ${data.agent_id}`,
  };

  return subjects[eventType] || `${prefix} Governance Event - ${eventType}`;
}

/**
 * Format HTML email body
 */
function formatEmailBody(eventType, data, tenantId) {
  const consoleUrl = process.env.CONSOLE_URL || 'https://console.regulator.ai';
  const timestamp = new Date().toISOString();

  const riskTierColors = {
    T0: '#10b981', // green
    T1: '#f59e0b', // amber
    T2: '#ef4444', // red
    T3: '#dc2626', // dark red
  };

  const riskColor = riskTierColors[data.risk_tier] || '#6b7280';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vienna Governance Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #e6e1dc;">
  <div style="max-width: 600px; margin: 40px auto; padding: 0 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #12131a 0%, #1a1b26 100%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
        🔔 Governance Alert
      </h1>
      <p style="margin: 0; font-size: 14px; color: rgba(230, 225, 220, 0.6);">
        ${new Date(timestamp).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
      </p>
    </div>

    <!-- Event Details -->
    <div style="background: #12131a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <span style="display: inline-block; padding: 6px 12px; background: ${riskColor}33; color: ${riskColor}; font-size: 12px; font-weight: 700; text-transform: uppercase; border-radius: 6px; border: 1px solid ${riskColor}66;">
          ${data.risk_tier || 'N/A'}
        </span>
        <span style="font-size: 18px; font-weight: 600; color: #ffffff;">
          ${eventType.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: rgba(230, 225, 220, 0.4); width: 140px;">Agent</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: 'SF Mono', Consolas, monospace; color: #ffffff;">${data.agent_id || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: rgba(230, 225, 220, 0.4);">Action</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: 'SF Mono', Consolas, monospace; color: #ffffff;">${data.action_type || 'N/A'}</td>
        </tr>
        ${data.approval_id ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: rgba(230, 225, 220, 0.4);">Approval ID</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: 'SF Mono', Consolas, monospace; color: #ffffff;">${data.approval_id}</td>
        </tr>
        ` : ''}
        ${data.intent_id ? `
        <tr>
          <td style="padding: 8px 0; font-size: 14px; color: rgba(230, 225, 220, 0.4);">Intent ID</td>
          <td style="padding: 8px 0; font-size: 14px; font-family: 'SF Mono', Consolas, monospace; color: #ffffff;">${data.intent_id}</td>
        </tr>
        ` : ''}
      </table>

      ${data.payload ? `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
        <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; font-weight: 600; color: rgba(230, 225, 220, 0.4); letter-spacing: 0.05em;">Payload</p>
        <pre style="margin: 0; padding: 12px; background: #0a0a0f; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; font-size: 12px; color: rgba(230, 225, 220, 0.8); font-family: 'SF Mono', Consolas, monospace; overflow-x: auto;">${JSON.stringify(data.payload, null, 2)}</pre>
      </div>
      ` : ''}
    </div>

    <!-- Actions -->
    <div style="background: #12131a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 24px; margin-bottom: 20px; text-align: center;">
      <a href="${consoleUrl}/approvals" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: #000000; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 14px;">
        View in Console →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: rgba(230, 225, 220, 0.3);">
        Vienna OS Governance Platform
      </p>
      <p style="margin: 0; font-size: 11px; color: rgba(230, 225, 220, 0.2);">
        <a href="${consoleUrl}/settings" style="color: rgba(230, 225, 220, 0.3); text-decoration: none;">Notification Settings</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send test email
 */
async function sendTestEmail(recipient) {
  return sendEventNotification({
    recipients: [recipient],
    eventType: 'approval_required',
    data: {
      agent_id: 'test_agent',
      action_type: 'test_action',
      risk_tier: 'T1',
      approval_id: 'test_apr_123',
      intent_id: 'test_int_456'
    },
    tenantId: 'test'
  });
}

module.exports = {
  sendEventNotification,
  sendTestEmail,
  formatSubject,
  formatEmailBody,
};
