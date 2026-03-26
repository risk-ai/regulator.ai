/**
 * Webhook Handler — Vienna OS SDK
 *
 * Express server that receives Vienna OS webhook callbacks
 * for approval notifications and other events.
 *
 * Setup:
 *   1. npm install express
 *   2. Create a webhook integration in Vienna OS pointing to your server
 *   3. Run: npx tsx examples/webhook-handler.ts
 */

// Note: This example uses express for simplicity. Install it separately:
// npm install express @types/express

import { ViennaClient } from '../src/index.js';

// Types for webhook payloads
interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface ApprovalRequiredPayload extends WebhookPayload {
  event: 'approval_required';
  data: {
    approvalId: string;
    intentId: string;
    action: string;
    source: string;
    riskTier: string;
    payload: Record<string, unknown>;
  };
}

interface PolicyViolationPayload extends WebhookPayload {
  event: 'policy_violation';
  data: {
    intentId: string;
    policyId: string;
    policyName: string;
    action: string;
    source: string;
  };
}

// Initialize the Vienna client for auto-approvals
const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY!,
});

/**
 * Handle incoming webhook events.
 * In production, verify the webhook signature before processing.
 */
async function handleWebhook(payload: WebhookPayload): Promise<{ status: number; body: string }> {
  console.log(`[${new Date().toISOString()}] Received: ${payload.event}`);

  switch (payload.event) {
    case 'approval_required': {
      const data = (payload as ApprovalRequiredPayload).data;
      console.log(`  Approval needed: ${data.action} from ${data.source} [${data.riskTier}]`);

      // Example: Auto-approve low-risk items from trusted agents
      if (data.riskTier === 'T0' || data.riskTier === 'T1') {
        console.log(`  Auto-approving low-risk action...`);
        await vienna.approvals.approve(data.approvalId, {
          operator: 'webhook-auto',
          notes: `Auto-approved: ${data.riskTier} action from ${data.source}`,
        });
        return { status: 200, body: 'auto-approved' };
      }

      // High-risk: notify team (in production, send to Slack/PagerDuty)
      console.log(`  ⚠️  High-risk action requires manual review`);
      return { status: 200, body: 'queued-for-review' };
    }

    case 'policy_violation': {
      const data = (payload as PolicyViolationPayload).data;
      console.log(`  🚨 Violation: ${data.policyName} triggered by ${data.source}`);
      // In production: alert, log, suspend agent, etc.
      return { status: 200, body: 'violation-logged' };
    }

    case 'intent_executed':
      console.log(`  ✅ Intent executed: ${JSON.stringify(payload.data)}`);
      return { status: 200, body: 'ok' };

    case 'agent_suspended':
      console.log(`  🔴 Agent suspended: ${JSON.stringify(payload.data)}`);
      return { status: 200, body: 'ok' };

    default:
      console.log(`  Unknown event: ${payload.event}`);
      return { status: 200, body: 'ok' };
  }
}

// ─── Simple HTTP Server (no express dependency) ──────────────────────────────

import { createServer } from 'node:http';

const PORT = parseInt(process.env.PORT ?? '3100', 10);

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhooks/vienna') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks).toString('utf-8');

    try {
      const payload = JSON.parse(body) as WebhookPayload;
      const result = await handleWebhook(payload);
      res.writeHead(result.status, { 'Content-Type': 'text/plain' });
      res.end(result.body);
    } catch (err) {
      console.error('Failed to process webhook:', err);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('invalid payload');
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`Vienna webhook handler listening on http://localhost:${PORT}`);
  console.log(`  POST /webhooks/vienna — receive events`);
  console.log(`  GET  /health          — health check`);
});
