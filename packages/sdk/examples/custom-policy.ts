/**
 * Custom Policy — Vienna OS SDK
 *
 * Creates a policy, submits an intent that triggers it,
 * and demonstrates the governance denial flow.
 * Run: npx tsx examples/custom-policy.ts
 */
import { ViennaClient, ViennaError } from '../src/index.js';

async function main() {
  const vienna = new ViennaClient({
    apiKey: process.env.VIENNA_API_KEY!,
  });

  // 1. Create a high-value transfer gate policy
  console.log('Creating policy...');
  const policy = await vienna.policies.create({
    name: 'High-Value Transfer Gate',
    description: 'Requires approval for transfers over $10,000',
    conditions: [
      { field: 'action_type', operator: 'equals', value: 'wire_transfer' },
      { field: 'amount', operator: 'gt', value: 10000 },
    ],
    actionOnMatch: 'require_approval',
    approvalTier: 'T2',
    priority: 100,
  });
  console.log(`Policy created: ${policy.id} — ${policy.name}`);

  // 2. Test the policy with a dry-run evaluation
  console.log('\nEvaluating test payload...');
  const evaluation = await vienna.policies.evaluate({
    action_type: 'wire_transfer',
    amount: 75000,
    agent_id: 'billing-bot',
  });
  console.log('Evaluation result:', {
    finalAction: evaluation.finalAction,
    riskTier: evaluation.riskTier,
    matchedPolicies: evaluation.matchedPolicies.map((p) => p.policyName),
  });

  // 3. Submit an intent that triggers the policy
  console.log('\nSubmitting high-value intent...');
  const result = await vienna.intent.submit({
    action: 'wire_transfer',
    source: 'billing-bot',
    tenantId: 'prod',
    payload: {
      amount: 75000,
      currency: 'USD',
      recipient: 'vendor-123',
    },
  });

  console.log('Intent result:', {
    intentId: result.intentId,
    status: result.status, // Should be 'pending_approval'
    riskTier: result.riskTier,
    policyMatches: result.policyMatches.map((p) => p.policyName),
  });

  // 4. A small transfer should pass through
  console.log('\nSubmitting low-value intent...');
  const smallResult = await vienna.intent.submit({
    action: 'wire_transfer',
    source: 'billing-bot',
    tenantId: 'prod',
    payload: {
      amount: 500,
      currency: 'USD',
      recipient: 'vendor-789',
    },
  });
  console.log('Small transfer:', smallResult.status); // Should be 'executed'

  // 5. Clean up — delete the policy
  await vienna.policies.delete(policy.id);
  console.log('\nPolicy cleaned up.');
}

main().catch(console.error);
