/**
 * Customer Support Agent — Vienna OS Example
 * 
 * Demonstrates tiered governance for customer support actions:
 * - T0: Information requests (auto-approved)
 * - T1: Low-risk actions like small refunds (auto-approved)
 * - T2: Medium-risk actions like large refunds (requires approval)
 * - T3: High-risk actions like account deletion (requires senior approval)
 */

import { ViennaClient } from 'vienna-os';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize clients
const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY,
  agentId: process.env.VIENNA_AGENT_ID || 'customer-support-agent',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify customer intent using OpenAI
 */
async function classifyIntent(customerMessage) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a customer support intent classifier. Given a customer message, extract:
        - action: one of [check_order_status, process_refund, reset_password, update_email, change_address, cancel_subscription, delete_account, general_question]
        - amount: number (for refunds, subscriptions)
        - order_id: string (if mentioned)
        - reason: string (customer's reason)
        
        Respond ONLY with valid JSON.`
      },
      {
        role: 'user',
        content: customerMessage
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

/**
 * Handle customer request with Vienna governance
 */
async function handleCustomerRequest(customerMessage) {
  console.log('\n📬 Customer:', customerMessage);
  console.log('─'.repeat(60));

  try {
    // Step 1: Classify intent
    console.log('🔍 Classifying intent...');
    const intent = await classifyIntent(customerMessage);
    console.log('✓ Intent:', JSON.stringify(intent, null, 2));

    // Step 2: Submit to Vienna for governance
    console.log('\n🛡️  Submitting to Vienna OS...');
    const result = await vienna.submitIntent({
      action: intent.action,
      payload: {
        customer_message: customerMessage,
        ...intent,
        timestamp: new Date().toISOString(),
      },
    });

    // Step 3: Handle governance result
    console.log('✓ Vienna result:', result.pipeline);

    if (result.pipeline === 'executed') {
      // Auto-approved (T0 or T1)
      console.log('✅ AUTO-APPROVED');
      console.log(`   Risk Tier: ${result.risk_tier || 'T0'}`);
      console.log(`   Execution ID: ${result.execution_id}`);
      console.log(`   Warrant: ${result.warrant?.id || 'N/A'}`);

      // Execute the action
      const response = await executeAction(intent);
      console.log('\n💬 Agent response:', response);
      return response;

    } else if (result.pipeline === 'pending_approval') {
      // Requires human approval (T2 or T3)
      console.log('⏳ PENDING APPROVAL');
      console.log(`   Risk Tier: ${result.risk_tier || 'Unknown'}`);
      console.log(`   Proposal ID: ${result.proposal_id}`);
      console.log(`   Reason: ${result.reason || 'N/A'}`);

      const response = `Your request has been submitted for review. ` +
        `Reference ID: ${result.proposal_id}. ` +
        `You'll receive an update within ${result.risk_tier === 'T3' ? '24 hours' : '2 hours'}.`;
      console.log('\n💬 Agent response:', response);
      return response;

    } else if (result.pipeline === 'denied') {
      // Blocked by policy
      console.log('❌ DENIED');
      console.log(`   Reason: ${result.reason}`);

      const response = `I'm sorry, but I cannot process this request. ${result.reason}`;
      console.log('\n💬 Agent response:', response);
      return response;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'UNAUTHORIZED') {
      return 'System error: Invalid API key. Please contact support.';
    } else if (error.code === 'RATE_LIMITED') {
      return 'System is busy. Please try again in a few minutes.';
    } else {
      return 'I apologize, but I encountered an error processing your request. Please contact support.';
    }
  }
}

/**
 * Execute approved action (mock implementation)
 */
async function executeAction(intent) {
  switch (intent.action) {
    case 'check_order_status':
      return `Your order ${intent.order_id || '#12345'} shipped on March 15. Tracking: USPS 9400123456789012345678.`;

    case 'process_refund':
      return `Refund of $${intent.amount || 0} has been processed to your original payment method. You should see it in 3-5 business days.`;

    case 'reset_password':
      return `Password reset link sent to your email. Please check your inbox (and spam folder).`;

    case 'update_email':
      return `Email address updated successfully. Please verify your new email to complete the change.`;

    case 'change_address':
      return `Shipping address updated for future orders.`;

    case 'cancel_subscription':
      return `Subscription cancelled. You'll retain access until the end of your billing period.`;

    case 'delete_account':
      return `Account deletion confirmed. All data will be permanently removed within 30 days as per our privacy policy.`;

    case 'general_question':
      return `${intent.reason || 'Happy to help!'} Is there anything specific I can assist you with?`;

    default:
      return `I've processed your request: ${intent.action}`;
  }
}

/**
 * Demo: Run example customer requests
 */
async function runDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Customer Support Agent — Vienna OS Governance Demo      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const examples = [
    // T0: Information request (auto-approved)
    "What's the status of my order #12345?",

    // T1: Small refund (auto-approved)
    "I'd like a refund for this $35 item. It arrived damaged.",

    // T2: Large refund (requires approval)
    "I need a $250 refund for order #98765. The product doesn't work.",

    // T3: Account deletion (requires senior approval)
    "Please delete my account and all my data.",
  ];

  for (const example of examples) {
    await handleCustomerRequest(example);
    console.log('\n' + '═'.repeat(60) + '\n');
    
    // Wait 2 seconds between demos
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✓ Demo complete!\n');
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}

export { handleCustomerRequest, classifyIntent, executeAction };
