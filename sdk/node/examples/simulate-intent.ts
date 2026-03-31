/**
 * Example: Simulate an intent without execution
 *
 * Simulation mode allows you to test policy evaluation
 * without actually executing the action or creating a warrant.
 */

import { ViennaClient } from '../src';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'my-agent-id',
  apiKey: process.env.VIENNA_API_KEY,
});

async function main() {
  try {
    console.log('Running simulations...\n');

    // Test 1: Low-risk action
    const lowRisk = await vienna.simulate({
      action: 'read_logs',
      payload: { service: 'api-gateway' },
    });

    console.log('Low-risk action (read_logs):');
    console.log('- Risk Tier:', lowRisk.risk_tier);
    console.log('- Would Auto-Approve:', lowRisk.would_approve);
    console.log();

    // Test 2: Medium-risk action
    const mediumRisk = await vienna.simulate({
      action: 'deploy',
      payload: { service: 'api-gateway', environment: 'staging' },
    });

    console.log('Medium-risk action (deploy to staging):');
    console.log('- Risk Tier:', mediumRisk.risk_tier);
    console.log('- Would Auto-Approve:', mediumRisk.would_approve);
    console.log();

    // Test 3: High-risk action
    const highRisk = await vienna.simulate({
      action: 'delete_data',
      payload: { table: 'users', environment: 'production' },
    });

    console.log('High-risk action (delete production data):');
    console.log('- Risk Tier:', highRisk.risk_tier);
    console.log('- Would Auto-Approve:', highRisk.would_approve);
    console.log('- Requires Approval:', !highRisk.would_approve);
    console.log();

    // Test 4: Critical action
    const critical = await vienna.simulate({
      action: 'shutdown_system',
      payload: { reason: 'maintenance' },
    });

    console.log('Critical action (system shutdown):');
    console.log('- Risk Tier:', critical.risk_tier);
    console.log('- Would Block:', critical.pipeline === 'blocked');
    console.log();

    console.log('✅ All simulations complete');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
