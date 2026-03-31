/**
 * Example: Approve a pending proposal (operator workflow)
 *
 * This example shows how an operator/human reviewer
 * approves a pending proposal to issue a warrant.
 */

import { ViennaClient } from '../src';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: 'operator-terminal', // Operator identity
  apiKey: process.env.VIENNA_API_KEY,
});

async function main() {
  const proposalId = process.argv[2];

  if (!proposalId) {
    console.error('Usage: ts-node approve-proposal.ts <proposal_id>');
    process.exit(1);
  }

  try {
    console.log(`Approving proposal ${proposalId}...\n`);

    // Approve the proposal
    const result = await vienna.approveProposal(proposalId, {
      reviewer: 'operator-alice',
      reason: 'Reviewed and approved for production deployment',
    });

    console.log('✅ Proposal approved');
    console.log('Warrant ID:', result.warrant.id);
    console.log('Status:', result.warrant.status);
    console.log();

    // Verify the issued warrant
    const verification = await vienna.verifyWarrant(result.warrant.id);
    console.log('Warrant verification:');
    console.log('- Valid:', verification.valid);
    console.log('- Issued at:', verification.warrant?.issued_at);
    console.log('- Expires at:', verification.warrant?.expires_at);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
