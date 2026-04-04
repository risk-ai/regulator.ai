/**
 * Customer Support Agent Demo (No OpenAI Required)
 * 
 * This demo shows Vienna OS governance without needing OpenAI API.
 * Uses pre-classified intents to demonstrate T0/T1/T2/T3 workflows.
 */

import { ViennaClient } from 'vienna-os';
import dotenv from 'dotenv';

dotenv.config();

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
  agentId: 'customer-support-demo',
});

/**
 * Execute action (mock implementation)
 */
function executeAction(intent) {
  switch (intent.action) {
    case 'check_order_status':
      return `Order ${intent.order_id} shipped on March 15. Tracking: USPS 9400123456789012345678.`;
    
    case 'process_refund':
      return `Refund of $${intent.amount} processed to your original payment method.`;
    
    case 'reset_password':
      return `Password reset link sent to your email.`;
    
    case 'delete_account':
      return `Account deletion confirmed. All data will be removed within 30 days.`;
    
    default:
      return `Action ${intent.action} completed.`;
  }
}

/**
 * Handle pre-classified intent
 */
async function handleIntent(description, intent) {
  console.log(`\n📬 ${description}`);
  console.log('─'.repeat(60));
  console.log('Intent:', JSON.stringify(intent, null, 2));

  try {
    console.log('\n🛡️  Submitting to Vienna OS...');
    const result = await vienna.submitIntent({
      action: intent.action,
      payload: intent,
    });

    console.log('✓ Vienna result:', result.pipeline);

    if (result.pipeline === 'executed') {
      console.log('✅ AUTO-APPROVED');
      console.log(`   Risk Tier: ${result.risk_tier || 'T0'}`);
      console.log(`   Warrant: ${result.warrant?.id || 'N/A'}`);
      
      const response = executeAction(intent);
      console.log('\n💬 Response:', response);
      
    } else if (result.pipeline === 'pending_approval') {
      console.log('⏳ PENDING APPROVAL');
      console.log(`   Risk Tier: ${result.risk_tier || 'Unknown'}`);
      console.log(`   Proposal ID: ${result.proposal_id}`);
      
      console.log('\n💬 Response: Request submitted for review. Reference:', result.proposal_id);
      
    } else if (result.pipeline === 'denied') {
      console.log('❌ DENIED');
      console.log(`   Reason: ${result.reason}`);
      
      console.log('\n💬 Response: Cannot process this request.', result.reason);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Run demo scenarios
 */
async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        Customer Support Agent — Tiered Governance         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // T0: Information request (instant approval)
  await handleIntent(
    'T0: Customer asks for order status',
    {
      action: 'check_order_status',
      order_id: '#12345',
      customer_id: 'cust_789',
    }
  );

  console.log('\n' + '═'.repeat(60));
  await new Promise(r => setTimeout(r, 2000));

  // T1: Small refund (instant approval)
  await handleIntent(
    'T1: Customer requests small refund ($35)',
    {
      action: 'process_refund',
      amount: 35,
      order_id: '#12345',
      reason: 'Damaged item',
      customer_id: 'cust_789',
    }
  );

  console.log('\n' + '═'.repeat(60));
  await new Promise(r => setTimeout(r, 2000));

  // T2: Large refund (requires approval)
  await handleIntent(
    'T2: Customer requests large refund ($250)',
    {
      action: 'process_refund',
      amount: 250,
      order_id: '#98765',
      reason: 'Product defective',
      customer_id: 'cust_789',
    }
  );

  console.log('\n' + '═'.repeat(60));
  await new Promise(r => setTimeout(r, 2000));

  // T3: Account deletion (requires senior approval)
  await handleIntent(
    'T3: Customer requests account deletion',
    {
      action: 'delete_account',
      customer_id: 'cust_789',
      reason: 'No longer using service',
    }
  );

  console.log('\n' + '═'.repeat(60));
  console.log('\n✓ Demo complete!');
  console.log('\nKey Takeaways:');
  console.log('  • T0 actions (order status): Instant approval, no review');
  console.log('  • T1 actions (small refunds): Instant approval, logged');
  console.log('  • T2 actions (large refunds): Human review required');
  console.log('  • T3 actions (account deletion): Senior approval required');
  console.log('\nCheck the Vienna OS console for full audit trail:');
  console.log('  → https://console.regulator.ai\n');
}

runDemo().catch(console.error);
