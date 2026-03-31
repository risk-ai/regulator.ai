/**
 * Example: Submit an intent through Vienna OS
 *
 * This example demonstrates the basic flow of submitting an action
 * through the Vienna governance pipeline.
 */

import { ViennaClient } from '../src';

// Initialize the client
const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'my-agent-id',
  apiKey: process.env.VIENNA_API_KEY, // vos_...
});

async function main() {
  try {
    console.log('Submitting intent...\n');

    // Submit an intent for deployment
    const result = await vienna.submitIntent({
      action: 'deploy',
      payload: {
        service: 'api-gateway',
        version: 'v2.4.1',
        environment: 'production',
      },
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    // Handle different pipeline outcomes
    if (result.pipeline === 'executed') {
      console.log('\n✅ Intent executed immediately');
      console.log('Warrant ID:', result.warrant?.id);
      console.log('Risk Tier:', result.risk_tier);
    } else if (result.pipeline === 'pending_approval') {
      console.log('\n⏳ Intent requires approval');
      console.log('Proposal ID:', result.proposal?.id);
      console.log('Awaiting operator review...');
    } else if (result.pipeline === 'blocked') {
      console.log('\n🚫 Intent blocked by policy');
      console.log('Reason:', result.reason);
    }

    // If we have a warrant, verify it
    if (result.warrant) {
      console.log('\nVerifying warrant...');
      const verification = await vienna.verifyWarrant(result.warrant.id);
      console.log('Valid:', verification.valid);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
