/**
 * Approval Workflow Example
 * 
 * This example demonstrates T2/T3 approval polling and management
 * with detailed status tracking and approval handling.
 */

import { ViennaClient } from '@vienna-os/sdk';

async function demonstrateApprovalWorkflow() {
  const vienna = new ViennaClient({
    apiKey: process.env.VIENNA_API_KEY!,
  });

  console.log('🔒 Vienna OS Approval Workflow Demo\n');

  try {
    // Submit a high-risk intent that will require approval
    console.log('🚀 Submitting high-risk intent (T3 - requires approval)...');
    const result = await vienna.intent.submit({
      action: 'wire_transfer',
      source: 'demo-agent',
      payload: {
        amount: 500000, // Large amount - will trigger T3 policies
        currency: 'USD',
        recipient: 'external-vendor',
        reason: 'Contract payment for Q1 services',
      },
      metadata: {
        environment: 'production',
        requester: 'finance-bot',
      },
    });

    console.log(`✅ Intent submitted: ${result.intentId}`);
    console.log(`📊 Risk Tier: ${result.riskTier}`);
    console.log(`🔍 Initial Status: ${result.status}`);

    if (result.policyMatches.length > 0) {
      console.log('\n📋 Triggered policies:');
      result.policyMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.policyName} - ${match.action}`);
        if (match.reason) {
          console.log(`     Reason: ${match.reason}`);
        }
      });
    }

    if (result.status === 'pending_approval') {
      console.log('\n⏳ Intent requires approval. Starting polling process...');
      
      // Start approval polling
      const approvalResult = await pollForApproval(vienna, result.intentId, {
        maxWaitTime: 300000, // 5 minutes
        pollInterval: 5000,  // 5 seconds
        showProgress: true,
      });

      switch (approvalResult.status) {
        case 'executed':
          console.log('\n🎉 Intent approved and executed!');
          if (approvalResult.executionId) {
            console.log(`🔗 Execution ID: ${approvalResult.executionId}`);
          }
          break;
          
        case 'denied':
          console.log('\n❌ Intent was denied');
          if (approvalResult.denialReason) {
            console.log(`📝 Reason: ${approvalResult.denialReason}`);
          }
          break;
          
        case 'timeout':
          console.log('\n⏱️  Approval timed out');
          break;
          
        default:
          console.log(`\n❓ Unknown final status: ${approvalResult.status}`);
      }

      // Show approval history
      await showApprovalHistory(vienna, result.intentId);
      
    } else if (result.status === 'executed') {
      console.log('\n🎉 Intent executed immediately (unexpected for T3!)');
    } else if (result.status === 'denied') {
      console.log('\n❌ Intent denied immediately by policy');
    }

    // Demonstrate approval management
    console.log('\n📊 Checking current pending approvals...');
    await demonstrateApprovalManagement(vienna);

  } catch (error) {
    console.error('\n💥 Error:', error);
  }
}

interface ApprovalPollOptions {
  maxWaitTime: number;
  pollInterval: number;
  showProgress: boolean;
}

interface ApprovalResult {
  status: string;
  executionId?: string;
  denialReason?: string;
}

async function pollForApproval(
  vienna: ViennaClient,
  intentId: string,
  options: ApprovalPollOptions
): Promise<ApprovalResult> {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < options.maxWaitTime) {
    attempts++;
    
    if (options.showProgress) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`🔄 Poll attempt ${attempts} (${elapsed}s elapsed)`);
    }

    try {
      const status = await vienna.intent.status(intentId);
      
      if (status.status === 'executed') {
        return {
          status: 'executed',
          executionId: status.executionId,
        };
      }
      
      if (status.status === 'denied') {
        return {
          status: 'denied',
          denialReason: 'Intent denied by approver', // In real implementation, get from status
        };
      }
      
      if (status.status === 'cancelled') {
        return { status: 'cancelled' };
      }
      
      // Still pending, continue polling
      if (options.showProgress) {
        console.log(`⏳ Still pending approval...`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Poll error on attempt ${attempts}:`, error);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, options.pollInterval));
  }
  
  return { status: 'timeout' };
}

async function showApprovalHistory(vienna: ViennaClient, intentId: string) {
  console.log('\n📜 Approval History:');
  
  try {
    const approvals = await vienna.approvals.list({
      intentId,
    });
    
    if (approvals.length === 0) {
      console.log('  No approvals found for this intent');
      return;
    }
    
    approvals.forEach((approval, i) => {
      console.log(`  ${i + 1}. ${approval.id} - ${approval.status}`);
      console.log(`     Created: ${approval.createdAt}`);
      
      if (approval.approvedBy) {
        console.log(`     Approved by: ${approval.approvedBy}`);
        console.log(`     Approved at: ${approval.approvedAt}`);
      }
      
      if (approval.deniedBy) {
        console.log(`     Denied by: ${approval.deniedBy}`);
        console.log(`     Denial reason: ${approval.denialReason}`);
      }
    });
    
  } catch (error) {
    console.warn('⚠️  Could not fetch approval history:', error);
  }
}

async function demonstrateApprovalManagement(vienna: ViennaClient) {
  try {
    // List all pending approvals
    const pending = await vienna.approvals.list({ status: 'pending' });
    console.log(`📋 Found ${pending.length} pending approvals`);
    
    if (pending.length === 0) {
      console.log('  No pending approvals at this time');
      return;
    }
    
    // Show details of first few pending approvals
    const toShow = Math.min(3, pending.length);
    console.log(`\n🔍 Showing details for first ${toShow} pending approval(s):`);
    
    for (let i = 0; i < toShow; i++) {
      const approval = pending[i]!;
      console.log(`\n  ${i + 1}. Approval ${approval.id}:`);
      console.log(`     Intent: ${approval.intentId}`);
      console.log(`     Source: ${approval.source}`);
      console.log(`     Risk Tier: ${approval.riskTier}`);
      console.log(`     Created: ${approval.createdAt}`);
      console.log(`     Reason: ${approval.reason || 'Policy-based approval required'}`);
    }
    
    // In a real application, you might:
    // 1. Allow approvers to approve/deny via UI
    // 2. Send notifications to approvers
    // 3. Set up webhooks for approval status changes
    // 4. Implement escalation policies for overdue approvals
    
  } catch (error) {
    console.warn('⚠️  Could not demonstrate approval management:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  demonstrateApprovalWorkflow().catch(console.error);
}