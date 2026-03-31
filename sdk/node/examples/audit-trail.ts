/**
 * Example: Query the audit trail
 *
 * This example shows how to retrieve and display
 * the audit trail of all governance events.
 */

import { ViennaClient } from '../src';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'my-agent-id',
  apiKey: process.env.VIENNA_API_KEY,
});

async function main() {
  try {
    console.log('Fetching audit trail...\n');

    // Get recent audit entries
    const audit = await vienna.getAuditTrail(20);

    console.log(`Total entries: ${audit.total}`);
    console.log(`Showing ${audit.entries.length} most recent:\n`);

    // Display audit entries
    audit.entries.forEach((entry, i) => {
      console.log(`${i + 1}. [${entry.timestamp}]`);
      console.log(`   Action: ${entry.action}`);
      console.log(`   Agent: ${entry.agent_id}`);
      console.log(`   Status: ${entry.status}`);
      if (entry.warrant_id) {
        console.log(`   Warrant: ${entry.warrant_id}`);
      }
      if (entry.risk_tier) {
        console.log(`   Risk: ${entry.risk_tier}`);
      }
      console.log();
    });

    // Get system status
    console.log('System Status:');
    const status = await vienna.getSystemStatus();
    console.log('- Status:', status.status);
    console.log('- Uptime:', Math.floor(status.uptime / 60), 'minutes');
    console.log('- Version:', status.version);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
