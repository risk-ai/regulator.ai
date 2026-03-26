/**
 * Multi-Agent Fleet — Vienna OS SDK
 *
 * Demonstrates managing multiple agents with different trust levels
 * and observing different governance outcomes.
 * Run: npx tsx examples/multi-agent.ts
 */
import { ViennaClient } from '../src/index.js';

async function main() {
  const vienna = new ViennaClient({
    apiKey: process.env.VIENNA_API_KEY!,
  });

  // 1. Check fleet status
  const fleet = await vienna.fleet.list();
  console.log(`Fleet has ${fleet.length} agents\n`);

  // 2. Define agents with different trust profiles
  const agents = ['billing-bot', 'deploy-agent', 'data-crawler'];

  for (const agentId of agents) {
    try {
      const agent = await vienna.fleet.get(agentId);
      console.log(`${agent.name}: trust=${agent.trustScore}, status=${agent.status}, tier=${agent.riskTier}`);
    } catch {
      console.log(`${agentId}: not registered yet`);
    }
  }

  // 3. Submit intents from each agent — observe different outcomes
  console.log('\n--- Submitting intents ---\n');

  // High-trust agent: routine action → auto-approved
  const billingResult = await vienna.intent.submit({
    action: 'wire_transfer',
    source: 'billing-bot',
    payload: { amount: 500, currency: 'USD', recipient: 'vendor-001' },
  });
  console.log(`billing-bot (low amount): ${billingResult.status} [${billingResult.riskTier}]`);

  // Medium-trust agent: deployment → may need approval
  const deployResult = await vienna.intent.submit({
    action: 'deploy',
    source: 'deploy-agent',
    payload: { environment: 'production', service: 'api-gateway', version: '2.1.0' },
  });
  console.log(`deploy-agent (prod deploy): ${deployResult.status} [${deployResult.riskTier}]`);

  // Low-trust agent: data access → likely gated
  const crawlerResult = await vienna.intent.submit({
    action: 'data_access',
    source: 'data-crawler',
    payload: { dataset: 'customer_pii', operation: 'read', scope: 'all' },
  });
  console.log(`data-crawler (PII access): ${crawlerResult.status} [${crawlerResult.riskTier}]`);

  // 4. Check for any alerts
  console.log('\n--- Fleet Alerts ---\n');
  const alerts = await vienna.fleet.alerts({ resolved: false });
  if (alerts.length === 0) {
    console.log('No unresolved alerts.');
  } else {
    for (const alert of alerts) {
      console.log(`[${alert.severity}] ${alert.agentId}: ${alert.message}`);
    }
  }

  // 5. Review pending approvals
  console.log('\n--- Pending Approvals ---\n');
  const pending = await vienna.approvals.list({ status: 'pending' });
  if (pending.length === 0) {
    console.log('No pending approvals.');
  } else {
    for (const approval of pending) {
      console.log(`${approval.id}: ${approval.action} from ${approval.source} [${approval.riskTier}]`);
    }
  }
}

main().catch(console.error);
