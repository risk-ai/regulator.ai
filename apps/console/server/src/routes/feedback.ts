/**
 * Feedback API Routes
 * 
 * POST /api/v1/feedback - Submit bug report or feedback
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/jwtAuth.js';

export function createFeedbackRouter(): Router {
  const router = Router();

  /**
   * POST /api/v1/feedback
   * Submit user feedback or bug report
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { message, page, userAgent, timestamp, screenshot } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
          code: 'INVALID_INPUT',
          timestamp: new Date().toISOString(),
        });
      }

      // Build feedback payload
      const feedback = {
        message: message.trim(),
        page: page || 'unknown',
        userAgent: userAgent || 'unknown',
        timestamp: timestamp || new Date().toISOString(),
        user: authReq.user ? {
          userId: authReq.user.userId,
          email: authReq.user.email,
          tenantId: authReq.user.tenantId,
        } : null,
        hasScreenshot: !!screenshot,
      };

      // Send to Slack webhook if configured
      const slackWebhook = process.env.FEEDBACK_SLACK_WEBHOOK;
      if (slackWebhook) {
        await sendToSlack(slackWebhook, feedback, screenshot);
      } else {
        // Fallback: log to console
        console.log('[Feedback]', JSON.stringify(feedback, null, 2));
      }

      res.json({
        success: true,
        data: { received: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[Feedback] Submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback',
        code: 'FEEDBACK_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

/**
 * Send feedback to Slack via webhook
 */
async function sendToSlack(webhookUrl: string, feedback: any, screenshot?: string) {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🐛 New Bug Report / Feedback',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*User:*\n${feedback.user?.email || 'Anonymous'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Page:*\n${feedback.page}`,
        },
        {
          type: 'mrkdwn',
          text: `*Time:*\n${new Date(feedback.timestamp).toLocaleString()}`,
        },
        {
          type: 'mrkdwn',
          text: `*Tenant:*\n${feedback.user?.tenantId || 'N/A'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${feedback.message}`,
      },
    },
  ];

  if (feedback.hasScreenshot) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '📸 Screenshot attached (check API logs or store in S3)',
        },
      ],
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `User Agent: ${feedback.userAgent}`,
      },
    ],
  });

  const payload = {
    blocks,
    text: `New feedback from ${feedback.user?.email || 'Anonymous'}: ${feedback.message.substring(0, 100)}`,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }

  // TODO: If screenshot provided, upload to S3 and include link in Slack message
  // For now, screenshots are logged server-side but not sent to Slack
  // (Slack webhooks don't support file uploads directly)
}
