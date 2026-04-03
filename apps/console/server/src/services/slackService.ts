/**
 * Slack Integration Service
 * Phase 31, Feature 3
 */

import { query, queryOne } from '../db/postgres.js';

export interface SlackWorkspace {
  id: string;
  tenant_id: string;
  team_id: string;
  team_name: string;
  access_token: string;
  bot_user_id?: string;
  webhook_url?: string;
  channel_approvals?: string;
  channel_alerts?: string;
  enabled: boolean;
  installed_at: Date;
}

export interface SlackNotification {
  id: string;
  workspace_id: string;
  tenant_id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  channel_id: string;
  message_ts?: string;
  thread_ts?: string;
  sent_at: Date;
}

export interface SlackApprovalMessage {
  channel: string;
  action: string;
  agent_id: string;
  risk_tier: string;
  execution_id: string;
  details: string;
  warrant_id?: string;
}

export class SlackService {
  /**
   * Send approval request to Slack with interactive buttons
   */
  async sendApprovalRequest(
    tenantId: string,
    execution_id: string,
    data: SlackApprovalMessage
  ): Promise<void> {
    const workspace = await this.getWorkspace(tenantId);
    if (!workspace || !workspace.enabled) {
      console.log('[Slack] No workspace configured for tenant:', tenantId);
      return;
    }

    const channel = workspace.channel_approvals || workspace.channel_alerts;
    if (!channel) {
      console.log('[Slack] No approval channel configured');
      return;
    }

    // Risk tier badge styling
    const riskBadge = this.getRiskTierBadge(data.risk_tier);
    
    // Build Slack message with enhanced approval interface
    const message = {
      channel,
      text: `🤖 ${riskBadge} Approval Required - ${data.action}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🤖 ${riskBadge} Vienna OS Approval Required`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${data.agent_id}`,
            },
            {
              type: 'mrkdwn',
              text: `*Risk Tier:*\n${riskBadge}`,
            },
            {
              type: 'mrkdwn',
              text: `*Action:*\n${data.action}`,
            },
            {
              type: 'mrkdwn',
              text: `*Execution ID:*\n\`${execution_id}\``,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n${data.details}`,
          },
        },
        ...(data.warrant_id ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Warrant ID:* \`${data.warrant_id}\``,
          },
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve',
              },
              style: 'primary',
              value: execution_id,
              action_id: `approve_${execution_id}`,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Deny',
              },
              style: 'danger',
              value: execution_id,
              action_id: `deny_${execution_id}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Timestamp: ${new Date().toISOString()} | Use \`/vienna approve ${execution_id}\` or buttons above`,
            },
          ],
        },
      ],
    };

    // Send to Slack
    const response = await this.sendMessage(workspace.access_token, message);

    // Log notification
    if (response.ok) {
      await query(
        `INSERT INTO slack_notifications 
         (workspace_id, tenant_id, type, entity_type, entity_id, channel_id, message_ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          workspace.id,
          tenantId,
          'approval_request',
          'execution',
          execution_id,
          channel,
          response.ts,
        ]
      );
    }
  }

  /**
   * Legacy approval request (for backward compatibility)
   */
  async sendApprovalRequestLegacy(
    tenantId: string,
    approvalId: string,
    data: {
      agent_name: string;
      action_type: string;
      context: any;
    }
  ): Promise<void> {
    const workspace = await this.getWorkspace(tenantId);
    if (!workspace || !workspace.enabled) {
      console.log('[Slack] No workspace configured for tenant:', tenantId);
      return;
    }

    const channel = workspace.channel_approvals || workspace.channel_alerts;
    if (!channel) {
      console.log('[Slack] No approval channel configured');
      return;
    }

    // Build Slack message
    const message = {
      channel,
      text: `🤖 Approval Request from ${data.agent_name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤖 Agent Approval Request',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${data.agent_name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Action:*\n${data.action_type}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Context:*\n\`\`\`${JSON.stringify(data.context, null, 2)}\`\`\``,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve',
              },
              style: 'primary',
              value: approvalId,
              action_id: `approve_${approvalId}`,
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Deny',
              },
              style: 'danger',
              value: approvalId,
              action_id: `deny_${approvalId}`,
            },
          ],
        },
      ],
    };

    // Send to Slack
    const response = await this.sendMessage(workspace.access_token, message);

    // Log notification
    if (response.ok) {
      await query(
        `INSERT INTO slack_notifications 
         (workspace_id, tenant_id, type, entity_type, entity_id, channel_id, message_ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          workspace.id,
          tenantId,
          'approval_request',
          'approval',
          approvalId,
          channel,
          response.ts,
        ]
      );
    }
  }

  /**
   * Send policy violation alert
   */
  async sendPolicyViolation(
    tenantId: string,
    data: {
      agent_name: string;
      policy_name: string;
      action_type: string;
      violation_details: any;
    }
  ): Promise<void> {
    const workspace = await this.getWorkspace(tenantId);
    if (!workspace || !workspace.enabled) return;

    const channel = workspace.channel_alerts;
    if (!channel) return;

    const message = {
      channel,
      text: `⚠️ Policy Violation: ${data.policy_name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Policy Violation Detected',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Agent:*\n${data.agent_name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Policy:*\n${data.policy_name}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action Attempted:*\n${data.action_type}`,
          },
        },
      ],
    };

    await this.sendMessage(workspace.access_token, message);
  }

  /**
   * Send action completed notification
   */
  async sendActionCompleted(
    tenantId: string,
    data: {
      agent_name: string;
      action_type: string;
      result: any;
    }
  ): Promise<void> {
    const workspace = await this.getWorkspace(tenantId);
    if (!workspace || !workspace.enabled) return;

    const channel = workspace.channel_alerts;
    if (!channel) return;

    const message = {
      channel,
      text: `✅ Action Completed: ${data.action_type}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *${data.agent_name}* completed *${data.action_type}*`,
          },
        },
      ],
    };

    await this.sendMessage(workspace.access_token, message);
  }

  /**
   * Get workspace for tenant
   */
  private async getWorkspace(tenantId: string): Promise<SlackWorkspace | null> {
    try {
      return await queryOne<SlackWorkspace>(
        'SELECT * FROM slack_workspaces WHERE tenant_id = $1 AND enabled = true',
        [tenantId]
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Send message to Slack API
   */
  private async sendMessage(token: string, message: any): Promise<any> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return await response.json();
  }

  /**
   * Install Slack workspace (OAuth callback)
   */
  async installWorkspace(
    tenantId: string,
    code: string,
    userId: string
  ): Promise<SlackWorkspace> {
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      throw new Error(`Slack OAuth failed: ${tokenData.error}`);
    }

    // Store workspace
    const workspace = await queryOne<SlackWorkspace>(
      `INSERT INTO slack_workspaces 
       (tenant_id, team_id, team_name, access_token, bot_user_id, installed_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (team_id) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           installed_by = EXCLUDED.installed_by,
           installed_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        tenantId,
        tokenData.team.id,
        tokenData.team.name,
        tokenData.access_token,
        tokenData.bot_user_id,
        userId,
      ]
    );

    return workspace;
  }

  /**
   * Update an interaction message (for approve/deny responses)
   */
  async updateInteractionMessage(
    payload: any,
    update: { text?: string; blocks?: any[] }
  ): Promise<void> {
    const workspace = await this.getWorkspaceByTeamId(payload.team.id);
    if (!workspace) return;

    await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workspace.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: payload.channel.id,
        ts: payload.message.ts,
        ...update,
      }),
    });
  }

  /**
   * Get workspace by Slack team ID
   */
  private async getWorkspaceByTeamId(teamId: string): Promise<SlackWorkspace | null> {
    try {
      return await queryOne<SlackWorkspace>(
        'SELECT * FROM slack_workspaces WHERE team_id = $1 AND enabled = true',
        [teamId]
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Get risk tier badge styling
   */
  private getRiskTierBadge(tier: string): string {
    switch (tier?.toUpperCase()) {
      case 'T1':
        return '🔴 T1';
      case 'T2':
        return '🟡 T2';
      case 'T3':
        return '🟠 T3';
      default:
        return `⚪ ${tier}`;
    }
  }
}

export const slackService = new SlackService();
