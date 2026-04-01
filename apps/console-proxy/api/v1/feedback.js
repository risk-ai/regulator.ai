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

    // Send to Discord webhook if configured
    const discordWebhook = process.env.FEEDBACK_DISCORD_WEBHOOK;
    if (discordWebhook) {
      await sendToDiscord(discordWebhook, feedback, screenshot);
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
 * Send feedback to Discord via webhook
 */
async function sendToDiscord(webhookUrl, feedback, screenshot) {
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
}
