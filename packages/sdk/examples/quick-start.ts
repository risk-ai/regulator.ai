/**
 * Quick Start — Vienna OS SDK
 *
 * Demonstrates basic intent submission and status checking.
 * Run: npx tsx examples/quick-start.ts
 */
import { ViennaClient, ViennaError } from '../src/index.js';

async function main() {
  // 1. Initialize the client
  const vienna = new ViennaClient({
    apiKey: process.env.VIENNA_API_KEY!,
    // baseUrl: 'http://localhost:3000', // uncomment for local dev
  });

  try {
    // 2. Submit an intent through the governance pipeline
    const result = await vienna.intent.submit({
      action: 'wire_transfer',
      source: 'billing-bot',
      tenantId: 'prod',
      payload: {
        amount: 5000,
        currency: 'USD',
        recipient: 'vendor-456',
      },
    });

    console.log('Intent submitted:', {
      intentId: result.intentId,
      status: result.status,
      riskTier: result.riskTier,
      policyMatches: result.policyMatches.length,
    });

    // 3. Check the status
    const status = await vienna.intent.status(result.intentId);
    console.log('Current status:', status.status);

    // 4. View fleet overview
    const fleet = await vienna.fleet.list();
    console.log(`Fleet: ${fleet.length} agents registered`);

    // 5. Check compliance
    const stats = await vienna.compliance.quickStats({ days: 7 });
    console.log('Compliance score (7d):', stats.complianceScore);
  } catch (error) {
    if (error instanceof ViennaError) {
      console.error(`Vienna API error [${error.code}]: ${error.message}`);
    } else {
      throw error;
    }
  }
}

main();
