/**
 * Basic Usage Example
 * 
 * This example demonstrates simple intent submission and status checking
 * with the Vienna OS SDK.
 */

import { ViennaClient } from '@vienna-os/sdk';

async function main() {
  // Initialize the Vienna client
  const vienna = new ViennaClient({
    apiKey: process.env.VIENNA_API_KEY!,
    baseUrl: 'https://console.regulator.ai', // Optional, defaults to production
  });

  try {
    // Submit an intent for governance evaluation
    console.log('🚀 Submitting intent...');
    const result = await vienna.intent.submit({
      action: 'file_write',
      source: 'example-bot',
      payload: {
        filename: 'user_data.csv',
        size: 1024000, // 1MB
        contains_pii: true,
      },
      metadata: {
        environment: 'production',
        component: 'data-export',
      },
    });

    console.log('✅ Intent submitted:', result.intentId);
    console.log(`📊 Risk Tier: ${result.riskTier}`);
    console.log(`🔍 Status: ${result.status}`);
    console.log(`📝 Audit ID: ${result.auditId}`);

    // If the intent is pending approval, show policy matches
    if (result.status === 'pending_approval') {
      console.log('\n⏳ Pending approval - Policy matches:');
      result.policyMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.policyName} (${match.action})`);
      });

      // Check status periodically
      console.log('\n⌛ Checking status...');
      let currentStatus = result.status;
      let attempts = 0;
      const maxAttempts = 10;

      while (currentStatus === 'pending_approval' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const statusResult = await vienna.intent.status(result.intentId);
        currentStatus = statusResult.status;
        attempts++;
        
        console.log(`🔄 Attempt ${attempts}: ${currentStatus}`);
      }

      if (currentStatus === 'executed') {
        console.log('🎉 Intent approved and executed!');
      } else if (currentStatus === 'denied') {
        console.log('❌ Intent denied');
      } else {
        console.log('⏱️  Still pending approval');
      }
    } else if (result.status === 'executed') {
      console.log('🎉 Intent executed immediately (low risk)');
    } else if (result.status === 'denied') {
      console.log('❌ Intent denied by policy');
    }

  } catch (error) {
    console.error('💥 Error:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      console.log('💡 Tip: Make sure your VIENNA_API_KEY is set correctly');
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}