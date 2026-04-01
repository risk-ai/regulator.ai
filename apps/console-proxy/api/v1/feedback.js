/**
 * Feedback API - Vercel Serverless
 * POST /api/v1/feedback
 */

import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Get authenticated user (optional - feedback can be anonymous)
    const user = await requireAuth(req, res, { optional: true });

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
      userAgent: userAgent || req.headers['user-agent'] || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      user: user ? {
        userId: user.user_id,
        email: user.email,
        tenantId: user.tenant_id,
      } : null,
      hasScreenshot: !!screenshot,
    };

    // Send to Slack webhook if configured
    const slackWebhook = process.env.FEEDBACK_SLACK_WEBHOOK;
    if (slackWebhook) {
      await sendToSlack(slackWebhook, feedback, screenshot);
    } else {
      // Fallback: log to Vercel console
      console.log('[Feedback]', JSON.stringify(feedback, null, 2));
    }

    res.status(200).json({
      success: true,
      data: { received: true },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
      code: 'FEEDBACK_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Send feedback to Slack via webhook
 */
async function sendToSlack(webhookUrl, feedback, screenshot) {
  const blocks = [
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
          text: '📸 Screenshot attached (check server logs or configure S3 upload)',
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
}
