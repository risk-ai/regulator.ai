/**
 * Slack Integration Routes
 * Phase 31, Feature 3
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/jwtAuth.js';
import { getTenantId } from '../middleware/tenantContext.js';
import { slackService } from '../services/slackService.js';
import { query, queryOne } from '../db/postgres.js';

export function createSlackRouter(): Router {
  const router = Router();

  /**
   * Get Slack workspace status
   * GET /api/v1/slack/status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);

      const workspace = await queryOne<any>(
        'SELECT id, team_id, team_name, channel_approvals, channel_alerts, enabled, installed_at FROM slack_workspaces WHERE tenant_id = $1',
        [tenantId]
      ).catch(() => null);

      if (!workspace) {
        return res.json({
          success: true,
          data: {
            installed: false,
          },
        });
      }

      res.json({
        success: true,
        data: {
          installed: true,
          team_name: workspace.team_name,
          enabled: workspace.enabled,
          channel_approvals: workspace.channel_approvals,
          channel_alerts: workspace.channel_alerts,
          installed_at: workspace.installed_at,
        },
      });
    } catch (error) {
      console.error('[Slack] Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Slack status',
        code: 'SLACK_STATUS_ERROR',
      });
    }
  });

  /**
   * OAuth callback
   * GET /api/v1/slack/oauth/callback
   */
  router.get('/oauth/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        return res.status(400).json({
          success: false,
          error: 'Missing code or state parameter',
          code: 'INVALID_OAUTH_PARAMS',
        });
      }

      // Decode state (contains tenantId and userId)
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const { tenantId, userId } = stateData;

      // Install workspace
      const workspace = await slackService.installWorkspace(
        tenantId,
        code as string,
        userId
      );

      // Redirect to success page
      res.redirect(`/settings/integrations?slack=success`);
    } catch (error) {
      console.error('[Slack] OAuth callback error:', error);
      res.redirect(`/settings/integrations?slack=error`);
    }
  });

  /**
   * Configure channels
   * POST /api/v1/slack/configure
   */
  router.post('/configure', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);

      const { channel_approvals, channel_alerts } = req.body;

      await query(
        `UPDATE slack_workspaces
         SET channel_approvals = $1,
             channel_alerts = $2
         WHERE tenant_id = $3`,
        [channel_approvals, channel_alerts, tenantId]
      );

      res.json({
        success: true,
        message: 'Slack channels configured successfully',
      });
    } catch (error) {
      console.error('[Slack] Configure error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure Slack channels',
        code: 'SLACK_CONFIGURE_ERROR',
      });
    }
  });

  /**
   * Enable/disable integration
   * POST /api/v1/slack/toggle
   */
  router.post('/toggle', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);

      const { enabled } = req.body;

      await query(
        'UPDATE slack_workspaces SET enabled = $1 WHERE tenant_id = $2',
        [enabled, tenantId]
      );

      res.json({
        success: true,
        message: `Slack integration ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('[Slack] Toggle error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle Slack integration',
        code: 'SLACK_TOGGLE_ERROR',
      });
    }
  });

  /**
   * Test notification
   * POST /api/v1/slack/test
   */
  router.post('/test', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const tenantId = getTenantId(authReq);

      await slackService.sendActionCompleted(tenantId, {
        agent_name: 'Test Agent',
        action_type: 'test_notification',
        result: { success: true },
      });

      res.json({
        success: true,
        message: 'Test notification sent to Slack',
      });
    } catch (error) {
      console.error('[Slack] Test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test notification',
        code: 'SLACK_TEST_ERROR',
      });
    }
  });

  /**
   * Handle Slack interactive message callbacks
   * POST /api/v1/slack/interactions
   */
  router.post('/interactions', async (req: Request, res: Response) => {
    try {
      const payload = JSON.parse(req.body.payload);
      
      if (payload.type === 'block_actions') {
        const action = payload.actions[0];
        const actionId = action.action_id;
        const value = action.value; // This is the execution_id or approval_id
        const userId = payload.user.id;
        const userName = payload.user.name;

        if (actionId.startsWith('approve_')) {
          // Handle approval
          const executionId = value;
          
          // Update approval status in database
          await query(
            'UPDATE approval_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE execution_id = $3',
            ['approved', userId, executionId]
          );

          // Update Slack message to show approval
          await slackService.updateInteractionMessage(payload, {
            text: `✅ Approved by <@${userId}>`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *Approved* by <@${userId}> at ${new Date().toISOString()}`,
                },
              },
            ],
          });

          // Trigger execution continuation (placeholder - would integrate with Vienna runtime)
          console.log(`[Slack] Execution ${executionId} approved by ${userName}`);

        } else if (actionId.startsWith('deny_')) {
          // Handle denial
          const executionId = value;
          
          // Update approval status in database
          await query(
            'UPDATE approval_requests SET status = $1, denied_by = $2, denied_at = CURRENT_TIMESTAMP WHERE execution_id = $3',
            ['denied', userId, executionId]
          );

          // Update Slack message to show denial
          await slackService.updateInteractionMessage(payload, {
            text: `❌ Denied by <@${userId}>`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `❌ *Denied* by <@${userId}> at ${new Date().toISOString()}`,
                },
              },
            ],
          });

          console.log(`[Slack] Execution ${executionId} denied by ${userName}`);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('[Slack] Interaction error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to handle Slack interaction',
        code: 'SLACK_INTERACTION_ERROR',
      });
    }
  });

  /**
   * Handle Slack slash commands
   * POST /api/v1/slack/commands
   */
  router.post('/commands', async (req: Request, res: Response) => {
    try {
      const { command, text, user_id, team_id } = req.body;

      // Get tenant from Slack team_id
      const workspace = await queryOne<any>(
        'SELECT tenant_id FROM slack_workspaces WHERE team_id = $1',
        [team_id]
      ).catch(() => null);

      if (!workspace) {
        return res.json({
          response_type: 'ephemeral',
          text: 'Vienna OS integration not found for this workspace.',
        });
      }

      const tenantId = workspace.tenant_id;

      if (command === '/vienna') {
        const parts = text.trim().split(' ');
        const subcommand = parts[0];

        switch (subcommand) {
          case 'status':
            // Get system health and active executions
            const activeExecutions = await query(
              'SELECT COUNT(*) as count FROM executions WHERE tenant_id = $1 AND status IN ($2, $3)',
              [tenantId, 'running', 'pending']
            );

            const pendingApprovals = await query(
              'SELECT COUNT(*) as count FROM approval_requests WHERE tenant_id = $1 AND status = $2',
              [tenantId, 'pending']
            );

            return res.json({
              response_type: 'ephemeral',
              text: `📊 *Vienna OS Status*\n• Active Executions: ${activeExecutions[0]?.count || 0}\n• Pending Approvals: ${pendingApprovals[0]?.count || 0}\n• System: ✅ Operational`,
            });

          case 'approve':
            const approveId = parts[1];
            if (!approveId) {
              return res.json({
                response_type: 'ephemeral',
                text: 'Usage: `/vienna approve <execution_id>`',
              });
            }

            // Approve the execution
            const approveResult = await query(
              'UPDATE approval_requests SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE execution_id = $3 AND tenant_id = $4',
              ['approved', user_id, approveId, tenantId]
            );

            if (approveResult.rowCount === 0) {
              return res.json({
                response_type: 'ephemeral',
                text: `❌ No pending approval found for execution ID: ${approveId}`,
              });
            }

            return res.json({
              response_type: 'in_channel',
              text: `✅ <@${user_id}> approved execution \`${approveId}\``,
            });

          case 'deny':
            const denyId = parts[1];
            const reason = parts.slice(2).join(' ') || 'No reason provided';
            
            if (!denyId) {
              return res.json({
                response_type: 'ephemeral',
                text: 'Usage: `/vienna deny <execution_id> [reason]`',
              });
            }

            // Deny the execution
            const denyResult = await query(
              'UPDATE approval_requests SET status = $1, denied_by = $2, denied_at = CURRENT_TIMESTAMP, denial_reason = $3 WHERE execution_id = $4 AND tenant_id = $5',
              ['denied', user_id, reason, denyId, tenantId]
            );

            if (denyResult.rowCount === 0) {
              return res.json({
                response_type: 'ephemeral',
                text: `❌ No pending approval found for execution ID: ${denyId}`,
              });
            }

            return res.json({
              response_type: 'in_channel',
              text: `❌ <@${user_id}> denied execution \`${denyId}\`\nReason: ${reason}`,
            });

          case 'alerts':
            // Get recent anomaly alerts
            const alerts = await query(
              `SELECT type, severity, description, created_at 
               FROM anomalies 
               WHERE tenant_id = $1 
               ORDER BY created_at DESC 
               LIMIT 5`,
              [tenantId]
            );

            if (alerts.length === 0) {
              return res.json({
                response_type: 'ephemeral',
                text: '✅ No recent alerts',
              });
            }

            const alertText = alerts.map(alert => 
              `• ${alert.severity.toUpperCase()}: ${alert.description} (${new Date(alert.created_at).toLocaleString()})`
            ).join('\n');

            return res.json({
              response_type: 'ephemeral',
              text: `🚨 *Recent Alerts*\n${alertText}`,
            });

          default:
            return res.json({
              response_type: 'ephemeral',
              text: `Available commands:\n• \`/vienna status\` - System health\n• \`/vienna approve <id>\` - Approve execution\n• \`/vienna deny <id> [reason]\` - Deny execution\n• \`/vienna alerts\` - Recent alerts`,
            });
        }
      }

      res.json({
        response_type: 'ephemeral',
        text: 'Unknown command',
      });
    } catch (error) {
      console.error('[Slack] Command error:', error);
      res.status(500).json({
        response_type: 'ephemeral',
        text: 'Error processing command',
      });
    }
  });

  return router;
}
