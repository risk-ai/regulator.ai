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

  return router;
}
