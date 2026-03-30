/**
 * Slack Integration Service
 * Phase 31, Feature 3
 */
import { query, queryOne } from '../db/postgres.js';
export class SlackService {
    /**
     * Send approval request to Slack
     */
    async sendApprovalRequest(tenantId, approvalId, data) {
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
            await query(`INSERT INTO slack_notifications 
         (workspace_id, tenant_id, type, entity_type, entity_id, channel_id, message_ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                workspace.id,
                tenantId,
                'approval_request',
                'approval',
                approvalId,
                channel,
                response.ts,
            ]);
        }
    }
    /**
     * Send policy violation alert
     */
    async sendPolicyViolation(tenantId, data) {
        const workspace = await this.getWorkspace(tenantId);
        if (!workspace || !workspace.enabled)
            return;
        const channel = workspace.channel_alerts;
        if (!channel)
            return;
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
    async sendActionCompleted(tenantId, data) {
        const workspace = await this.getWorkspace(tenantId);
        if (!workspace || !workspace.enabled)
            return;
        const channel = workspace.channel_alerts;
        if (!channel)
            return;
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
    async getWorkspace(tenantId) {
        try {
            return await queryOne('SELECT * FROM slack_workspaces WHERE tenant_id = $1 AND enabled = true', [tenantId]);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Send message to Slack API
     */
    async sendMessage(token, message) {
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
    async installWorkspace(tenantId, code, userId) {
        // Exchange code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code,
            }),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenData.ok) {
            throw new Error(`Slack OAuth failed: ${tokenData.error}`);
        }
        // Store workspace
        const workspace = await queryOne(`INSERT INTO slack_workspaces 
       (tenant_id, team_id, team_name, access_token, bot_user_id, installed_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (team_id) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           installed_by = EXCLUDED.installed_by,
           installed_at = CURRENT_TIMESTAMP
       RETURNING *`, [
            tenantId,
            tokenData.team.id,
            tokenData.team.name,
            tokenData.access_token,
            tokenData.bot_user_id,
            userId,
        ]);
        return workspace;
    }
}
export const slackService = new SlackService();
//# sourceMappingURL=slackService.js.map