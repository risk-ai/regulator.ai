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

      // Send to Discord webhook if configured
      const discordWebhook = process.env.FEEDBACK_DISCORD_WEBHOOK;
      if (discordWebhook) {
        await sendToDiscord(discordWebhook, feedback, screenshot);
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
 * Send feedback to Discord via webhook
 */
async function sendToDiscord(webhookUrl: string, feedback: any, screenshot?: string) {
  const embed = {
    title: '🐛 New Bug Report / Feedback',
    color: 0x5865F2, // Discord blurple
    fields: [
      {
        name: '👤 User',
        value: feedback.user?.email || 'Anonymous',
        inline: true,
      },
      {
        name: '📍 Page',
        value: `\`${feedback.page}\``,
        inline: true,
      },
      {
        name: '🕐 Time',
        value: new Date(feedback.timestamp).toLocaleString(),
        inline: true,
      },
      {
        name: '🏢 Tenant',
        value: `\`${feedback.user?.tenantId?.substring(0, 8) || 'N/A'}\``,
        inline: true,
      },
      {
        name: '💬 Message',
        value: feedback.message.length > 1024 ? feedback.message.substring(0, 1021) + '...' : feedback.message,
        inline: false,
      },
    ],
    footer: {
      text: `User Agent: ${feedback.userAgent.substring(0, 100)}`,
    },
    timestamp: new Date(feedback.timestamp).toISOString(),
  };

  if (feedback.hasScreenshot) {
    embed.fields.push({
      name: '📸 Screenshot',
      value: 'Screenshot captured (check server logs or configure S3 upload)',
      inline: false,
    });
  }

  const payload = {
    content: `New feedback from **${feedback.user?.email || 'Anonymous'}**`,
    embeds: [embed],
    username: 'Vienna Feedback Bot',
    avatar_url: 'https://regulator.ai/logo-icon.png',
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }

  // Note: Screenshot support requires S3/CDN configuration
  // Discord embeds support image URLs via embed.image.url
  // To enable: Set S3_BUCKET and S3_REGION env vars, upload screenshot,
  // then add { image: { url: uploadedUrl } } to embed
}
