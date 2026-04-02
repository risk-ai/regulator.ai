/**
 * Example: Policy Simulation (Dry Run)
 *
 * Test how Vienna's governance pipeline will evaluate your intents
 * BEFORE actually executing them. No side effects, no warrants issued.
 *
 * Use cases:
 * - Validate policy configuration before deploying changes
 * - Test that new agents will be allowed to perform their actions
 * - Preview risk tier classification for an intent
 * - Debug "why was my intent blocked?" scenarios
 */

import { ViennaClient } from '../src';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'policy-tester',
  apiKey: process.env.VIENNA_API_KEY,
});

async function main() {
  // ── Example 1: Simulate a deployment intent ──────────────────

  console.log('=== Simulating deployment intent ===\n');

  const deployResult = await vienna.simulate({
    action: 'deploy',
    payload: {
      service: 'api-gateway',
      version: 'v2.5.0',
      environment: 'production',
    },
  });

  console.log('Pipeline:', deployResult.pipeline);
  console.log('Risk Tier:', deployResult.risk_tier);

  if (deployResult.pipeline === 'executed') {
    console.log('✅ Would execute immediately (T0/T1)');
    console.log('Warrant would be:', deployResult.warrant?.id);
  } else if (deployResult.pipeline === 'pending_approval') {
    console.log('⏳ Would require approval (T2/T3)');
    console.log('Required approvers:', deployResult.proposal?.required_approvals);
  } else if (deployResult.pipeline === 'blocked') {
    console.log('🚫 Would be BLOCKED by policy');
    console.log('Reason:', deployResult.reason);
  }

  // ── Example 2: Batch simulate multiple intents ───────────────

  console.log('\n=== Batch simulation ===\n');

  const testIntents = [
    { action: 'send_email', payload: { to: 'team@company.com' } },
    { action: 'restart_service', payload: { service: 'worker' } },
    { action: 'delete_production', payload: { table: 'users' } },
    { action: 'read_logs', payload: { service: 'api' } },
  ];

  for (const intent of testIntents) {
    try {
      const result = await vienna.simulate(intent);
      const icon = result.pipeline === 'blocked' ? '🚫'
        : result.pipeline === 'pending_approval' ? '⏳'
        : '✅';
      console.log(`${icon} ${intent.action}: ${result.pipeline} (${result.risk_tier || 'T0'})`);
    } catch (error) {
      console.log(`❌ ${intent.action}: Error — ${error}`);
    }
  }

  // ── Example 3: Test a new agent's permissions ────────────────

  console.log('\n=== Agent permission test ===\n');

  const newAgentClient = new ViennaClient({
    baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
    agentId: 'new-deploy-bot',
    apiKey: process.env.VIENNA_API_KEY,
  });

  const actions = ['deploy', 'restart_service', 'read_logs', 'modify_database'];

  console.log('Testing permissions for agent: new-deploy-bot');
  for (const action of actions) {
    try {
      const result = await newAgentClient.simulate({ action, payload: {} });
      console.log(`  ${action}: ${result.pipeline === 'blocked' ? '🚫 BLOCKED' : '✅ ALLOWED'}`);
    } catch (error) {
      console.log(`  ${action}: ❌ ERROR`);
    }
  }
}

main().catch(console.error);
