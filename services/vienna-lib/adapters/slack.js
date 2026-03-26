/**
 * Slack Notification Adapter — Vienna OS
 * 
 * Sends approval requests to Slack channels when T1/T2 actions need authorization.
 * Supports interactive buttons for approve/deny directly from Slack.
 * 
 * Configuration:
 *   SLACK_WEBHOOK_URL — Incoming webhook URL for notifications
 *   SLACK_APPROVAL_CHANNEL — Channel ID for approval requests
 */

class SlackAdapter {
  constructor(config = {}) {
    this.webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    this.approvalChannel = config.approvalChannel || process.env.SLACK_APPROVAL_CHANNEL;
    this.enabled = Boolean(this.webhookUrl);
  }

  /**
   * Send approval request to Slack
   */
  async sendApprovalRequest(approval) {
    if (!this.enabled) {
      console.log('[SlackAdapter] Not configured, skipping notification');
      return null;
    }

    const tierColors = {
      T0: '#94a3b8',
      T1: '#fbbf24',
      T2: '#ef4444',
    };

    const tierLabels = {
      T0: 'Auto-Approve',
      T1: '⚠️ Operator Approval Required',
      T2: '🔴 Multi-Party Approval Required',
    };

    const payload = {
      channel: this.approvalChannel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${tierLabels[approval.riskTier] || 'Approval Required'}: ${approval.action}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Action:*\n\`${approval.action}\`` },
            { type: 'mrkdwn', text: `*Risk Tier:*\n${approval.riskTier}` },
            { type: 'mrkdwn', text: `*Agent:*\n${approval.source || 'unknown'}` },
            { type: 'mrkdwn', text: `*Tenant:*\n${approval.tenantId || 'system'}` },
          ],
        },
      ],
      attachments: [
        {
          color: tierColors[approval.riskTier] || '#94a3b8',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Scope:*\n\`\`\`${JSON.stringify(approval.scope || {}, null, 2)}\`\`\``,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Approval ID: \`${approval.id}\` | Requested: ${new Date().toISOString()} | TTL: ${approval.ttl || 300}s`,
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '✅ Approve' },
                  style: 'primary',
                  action_id: `vienna_approve_${approval.id}`,
                  value: JSON.stringify({ approvalId: approval.id, decision: 'approve' }),
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '❌ Deny' },
                  style: 'danger',
                  action_id: `vienna_deny_${approval.id}`,
                  value: JSON.stringify({ approvalId: approval.id, decision: 'deny' }),
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📋 View Details' },
                  url: `https://console.regulator.ai/#approvals`,
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[SlackAdapter] Webhook failed:', response.status);
        return null;
      }

      return { sent: true, channel: this.approvalChannel };
    } catch (error) {
      console.error('[SlackAdapter] Error:', error.message);
      return null;
    }
  }

  /**
   * Send execution notification (post-approval)
   */
  async sendExecutionNotification(execution) {
    if (!this.enabled) return null;

    const statusEmoji = {
      executed: '✅',
      failed: '❌',
      timeout: '⏰',
      rejected: '🚫',
    };

    const payload = {
      channel: this.approvalChannel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji[execution.status] || '📋'} *Execution ${execution.status}:* \`${execution.action}\`\n` +
              `Warrant: \`${execution.warrantId || 'N/A'}\` | Tenant: ${execution.tenantId || 'system'} | Duration: ${execution.durationMs || '?'}ms`,
          },
        },
      ],
    };

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { sent: true };
    } catch (error) {
      console.error('[SlackAdapter] Execution notification error:', error.message);
      return null;
    }
  }

  /**
   * Send policy violation alert
   */
  async sendPolicyViolation(violation) {
    if (!this.enabled) return null;

    const payload = {
      channel: this.approvalChannel,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Policy Violation Detected' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Action:*\n\`${violation.action}\`` },
            { type: 'mrkdwn', text: `*Agent:*\n${violation.source || 'unknown'}` },
            { type: 'mrkdwn', text: `*Violation:*\n${violation.reason}` },
            { type: 'mrkdwn', text: `*Severity:*\n${violation.severity || 'high'}` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Warrant: \`${violation.warrantId || 'none'}\` | <https://console.regulator.ai/#history|View Audit Trail>` },
          ],
        },
      ],
    };

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { sent: true };
    } catch (error) {
      console.error('[SlackAdapter] Violation alert error:', error.message);
      return null;
    }
  }
}

module.exports = { SlackAdapter };
