/**
 * Slack Integration Adapter — Vienna OS
 * 
 * Sends rich Block Kit messages for approval requests, alerts, and governance events.
 * Supports interactive buttons for approve/deny workflows via Slack Interactivity.
 */

import type { IntegrationAdapter, IntegrationEvent, ConfigSchema } from './types.js';

const RISK_TIER_COLORS: Record<string, string> = {
  T0: '#22c55e', // green - auto-approved
  T1: '#f59e0b', // amber - needs approval
  T2: '#ef4444', // red - high risk
  T3: '#7c3aed', // purple - critical
};

const RISK_TIER_EMOJI: Record<string, string> = {
  T0: '🟢',
  T1: '🟡',
  T2: '🔴',
  T3: '🟣',
};

const EVENT_EMOJI: Record<string, string> = {
  approval_required: '🔔',
  approval_resolved: '✅',
  action_executed: '⚡',
  action_failed: '❌',
  policy_violation: '🚨',
  alert: '⚠️',
};

function buildBlocks(event: IntegrationEvent, config: Record<string, any>): any[] {
  const { type, data } = event;
  const emoji = EVENT_EMOJI[type] || '📋';
  const tierEmoji = data.risk_tier ? (RISK_TIER_EMOJI[data.risk_tier] || '') : '';
  const tierColor = data.risk_tier ? (RISK_TIER_COLORS[data.risk_tier] || '#6b7280') : '#6b7280';

  const blocks: any[] = [];

  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: `${emoji} Vienna: ${formatEventType(type)}`,
      emoji: true,
    },
  });

  // Summary section
  const fields: any[] = [];
  
  if (data.summary) {
    fields.push({
      type: 'mrkdwn',
      text: `*Summary*\n${data.summary}`,
    });
  }
  
  if (data.risk_tier) {
    fields.push({
      type: 'mrkdwn',
      text: `*Risk Tier*\n${tierEmoji} ${data.risk_tier}`,
    });
  }

  if (data.agent_id) {
    fields.push({
      type: 'mrkdwn',
      text: `*Agent*\n\`${data.agent_id}\``,
    });
  }

  if (data.action_type) {
    fields.push({
      type: 'mrkdwn',
      text: `*Action*\n\`${data.action_type}\``,
    });
  }

  if (fields.length > 0) {
    blocks.push({ type: 'section', fields });
  }

  // Details context
  if (data.details && Object.keys(data.details).length > 0) {
    const detailLines = Object.entries(data.details)
      .slice(0, 5)
      .map(([k, v]) => `• *${k}:* ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
    
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: detailLines },
    });
  }

  // IDs context line
  const contextElements: any[] = [];
  if (data.intent_id) {
    contextElements.push({ type: 'mrkdwn', text: `Intent: \`${data.intent_id.slice(0, 8)}\`` });
  }
  if (data.approval_id) {
    contextElements.push({ type: 'mrkdwn', text: `Approval: \`${data.approval_id.slice(0, 8)}\`` });
  }
  contextElements.push({ type: 'mrkdwn', text: `🕐 ${new Date(data.timestamp).toLocaleString()}` });

  blocks.push({ type: 'context', elements: contextElements });

  // Approve/Deny buttons for approval events
  if (type === 'approval_required' && data.approval_id) {
    blocks.push({ type: 'divider' });

    // Mention users if configured
    if (config.mention_users && config.mention_users.length > 0) {
      const mentions = config.mention_users.map((u: string) => `<@${u}>`).join(' ');
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `👋 ${mentions} — approval needed` },
      });
    }

    blocks.push({
      type: 'actions',
      block_id: `vienna_approval_${data.approval_id}`,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Approve', emoji: true },
          style: 'primary',
          action_id: 'vienna_approve',
          value: JSON.stringify({
            approval_id: data.approval_id,
            intent_id: data.intent_id,
          }),
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Deny', emoji: true },
          style: 'danger',
          action_id: 'vienna_deny',
          value: JSON.stringify({
            approval_id: data.approval_id,
            intent_id: data.intent_id,
          }),
        },
      ],
    });
  }

  return blocks;
}

function formatEventType(type: string): string {
  return type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const slackAdapter: IntegrationAdapter = {
  type: 'slack',

  validateConfig(config) {
    const errors: string[] = [];
    if (!config.webhook_url) errors.push('Webhook URL is required');
    if (config.webhook_url && !config.webhook_url.startsWith('https://hooks.slack.com/')) {
      errors.push('Webhook URL must start with https://hooks.slack.com/');
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async sendNotification(event, config) {
    const blocks = buildBlocks(event, config);
    const tierColor = event.data.risk_tier
      ? (RISK_TIER_COLORS[event.data.risk_tier] || '#6b7280')
      : '#6b7280';

    const payload: any = {
      text: `${EVENT_EMOJI[event.type] || '📋'} Vienna: ${formatEventType(event.type)} — ${event.data.summary || 'No summary'}`,
      blocks,
    };

    if (config.channel) {
      payload.channel = config.channel;
    }

    try {
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.text();

      if (!response.ok) {
        return { success: false, error: `Slack returned ${response.status}: ${body}`, response: { status: response.status, body } };
      }

      return { success: true, response: { status: response.status, body } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  },

  async testConnection(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      return { success: false, message: validation.errors!.join(', ') };
    }

    try {
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🔗 Vienna OS integration test — connection successful!',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '🔗 *Vienna OS Integration Test*\nThis Slack webhook is now connected to Vienna governance events.',
              },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `Tested at ${new Date().toISOString()}` },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, message: `Slack returned ${response.status}: ${body}` };
      }

      return { success: true, message: 'Test message sent to Slack channel' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Connection failed' };
    }
  },

  async handleCallback(payload) {
    // Slack interactive payload format
    const action = payload.actions?.[0];
    if (!action) {
      return { action: 'noop', data: {} };
    }

    const value = JSON.parse(action.value || '{}');

    if (action.action_id === 'vienna_approve') {
      return {
        action: 'approve',
        data: {
          approval_id: value.approval_id,
          intent_id: value.intent_id,
          reviewed_by: payload.user?.name || payload.user?.id || 'slack_user',
          decision_reason: 'Approved via Slack',
        },
      };
    }

    if (action.action_id === 'vienna_deny') {
      return {
        action: 'deny',
        data: {
          approval_id: value.approval_id,
          intent_id: value.intent_id,
          reviewed_by: payload.user?.name || payload.user?.id || 'slack_user',
          decision_reason: 'Denied via Slack',
        },
      };
    }

    return { action: 'unknown', data: { raw: payload } };
  },
};

export const slackConfigSchema: ConfigSchema = {
  type: 'slack',
  label: 'Slack',
  description: 'Send governance events to a Slack channel with interactive approve/deny buttons',
  icon: '💬',
  fields: [
    { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true, placeholder: 'https://hooks.slack.com/services/...' },
    { key: 'channel', label: 'Channel Override', type: 'text', required: false, placeholder: '#governance', help: 'Optional — overrides the webhook default channel' },
    { key: 'mention_users', label: 'Mention Users', type: 'multi-text', required: false, placeholder: 'U01ABCDEF', help: 'Slack user IDs to mention on approval requests' },
  ],
};
