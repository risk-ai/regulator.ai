#!/usr/bin/env node
/**
 * Vienna OS + LangChain Integration Example
 * 
 * This example demonstrates how to integrate Vienna OS governance with LangChain agents.
 * It shows how to wrap tools with governance, handle approvals, and maintain audit trails.
 * 
 * Usage:
 *   VIENNA_API_KEY=vna_xxx node index.ts
 */

import { config } from 'dotenv';
config();

import { createForLangChain } from '@vienna-os/sdk';
import type { IntentResult } from '@vienna-os/sdk';

// Mock LangChain types and tools for demonstration
interface Tool {
  name: string;
  description: string;
  call(args: any): Promise<string | object>;
}

interface Agent {
  invoke(input: { input: string }): Promise<{ output: string }>;
}

// Initialize Vienna OS adapter
const vienna = createForLangChain({
  apiKey: process.env.VIENNA_API_KEY || 'vna_demo_key',
  agentId: 'langchain-demo-agent',
});

// ─── Mock Tools ─────────────────────────────────────────────────────────────

/** Mock web search tool */
const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  async call(args: { query: string; max_results?: number }) {
    console.log(`  🔍 Executing web search: "${args.query}"`);
    await simulateDelay(300);
    return {
      results: [
        {
          title: "AI Governance Best Practices 2024",
          url: "https://example.com/ai-governance", 
          snippet: "Latest guidelines for responsible AI development and deployment..."
        },
        {
          title: "Vienna OS: Open Source Agent Governance",
          url: "https://regulator.ai/blog/vienna-os",
          snippet: "A new approach to governing autonomous AI agents with policy engines..."
        }
      ],
      count: 2
    };
  }
};

/** Mock Slack notification tool */
const slackTool: Tool = {
  name: 'send_slack',
  description: 'Send a message to a Slack channel',
  async call(args: { channel: string; message: string }) {
    console.log(`  💬 Sending Slack message to ${args.channel}: "${args.message}"`);
    await simulateDelay(150);
    return { sent: true, timestamp: new Date().toISOString() };
  }
};

/** Mock data export tool */
const exportTool: Tool = {
  name: 'export_data',
  description: 'Export data from a database table',
  async call(args: { table: string; limit?: number; format?: string }) {
    console.log(`  📊 Exporting ${args.limit || 'all'} records from ${args.table}`);
    await simulateDelay(500);
    return {
      exported: args.limit || 1000,
      format: args.format || 'csv',
      file_path: `/tmp/${args.table}_export_${Date.now()}.csv`
    };
  }
};

/** Mock admin tool (will be denied) */
const adminTool: Tool = {
  name: 'delete_records',
  description: 'Delete records from database (admin only)',
  async call(args: { table: string; where: string }) {
    console.log(`  🗑️  Attempting to delete from ${args.table} where ${args.where}`);
    await simulateDelay(100);
    return { deleted: 0, message: 'This tool should be blocked by governance' };
  }
};

// ─── Governance Wrapper ────────────────────────────────────────────────────

/**
 * Wraps a LangChain tool with Vienna OS governance.
 * Before execution, submits an intent and waits for approval.
 */
function governedTool(name: string, originalTool: Tool): Tool {
  return {
    name: originalTool.name,
    description: `${originalTool.description} (Vienna OS governed)`,
    
    async call(args: any): Promise<string | object> {
      console.log(`\n━━━ Tool: ${name} ━━━`);
      console.log(`  Args: ${JSON.stringify(args)}`);
      
      try {
        // Submit intent to Vienna OS governance
        console.log(`  📨 Submitting intent to Vienna OS...`);
        const intent: IntentResult = await vienna.submitToolIntent(name, args);
        
        console.log(`  ⚖️  Risk Tier: ${intent.risk_tier || intent.tier || 'unknown'}`);
        console.log(`  📋 Status: ${intent.status}`);
        
        if (intent.status === 'approved' || intent.status === 'auto-approved') {
          console.log(`  ✅ ${intent.status === 'auto-approved' ? 'Auto-approved' : 'Approved'} — Warrant: ${intent.warrant_id?.slice(0, 12) || 'N/A'}...`);
          
          try {
            // Execute the original tool
            const result = await originalTool.call(args);
            
            // Report successful execution back to Vienna
            await vienna.reportExecution(
              intent.execution_id || intent.warrant_id || 'unknown', 
              'success', 
              { result: typeof result === 'string' ? { output: result } : result }
            );
            
            console.log(`  📒 Execution reported to audit trail`);
            return result;
            
          } catch (error) {
            // Report failed execution
            await vienna.reportExecution(
              intent.execution_id || intent.warrant_id || 'unknown',
              'failure',
              { error: (error as Error).message }
            );
            throw error;
          }
          
        } else if (intent.status === 'pending' || intent.status === 'pending_approval') {
          const message = `⏳ Action requires human approval. View at: ${intent.poll_url || 'console.regulator.ai'}`;
          console.log(`  ${message}`);
          
          // In a real implementation, you might poll for approval or return a special result
          throw new Error(message);
          
        } else {
          // Denied
          const reason = intent.reason || 'Policy violation';
          console.log(`  🚫 DENIED: ${reason}`);
          throw new Error(`Action denied: ${reason}`);
        }
        
      } catch (error) {
        if (error instanceof Error && error.message.includes('approval')) {
          throw error; // Re-throw approval-related errors
        }
        
        console.log(`  ❌ Governance error: ${(error as Error).message}`);
        throw new Error(`Governance check failed: ${(error as Error).message}`);
      }
    }
  };
}

// ─── Mock Agent Implementation ──────────────────────────────────────────────

/**
 * Simplified mock of a LangChain agent that uses governed tools
 */
function createMockAgent(tools: Tool[]): Agent {
  const toolMap = Object.fromEntries(tools.map(t => [t.name, t]));
  
  return {
    async invoke({ input }: { input: string }) {
      console.log(`\n🤖 Agent received: "${input}"\n`);
      
      // Simple intent parsing (in real LangChain, this would be done by the LLM)
      const actions: Array<{ tool: string; args: any }> = [];
      
      if (input.toLowerCase().includes('search') && input.toLowerCase().includes('governance')) {
        actions.push({ 
          tool: 'web_search', 
          args: { query: 'AI governance best practices', max_results: 3 } 
        });
      }
      
      if (input.toLowerCase().includes('share') && input.toLowerCase().includes('team')) {
        actions.push({ 
          tool: 'send_slack', 
          args: { channel: '#engineering', message: 'Found some great resources on AI governance!' } 
        });
      }
      
      if (input.toLowerCase().includes('export') && input.toLowerCase().includes('data')) {
        actions.push({ 
          tool: 'export_data', 
          args: { table: 'users', limit: 5000, format: 'csv' } 
        });
      }
      
      if (input.toLowerCase().includes('delete') || input.toLowerCase().includes('remove')) {
        actions.push({ 
          tool: 'delete_records', 
          args: { table: 'temp_data', where: 'created < "2023-01-01"' } 
        });
      }
      
      // If no actions parsed, default to search
      if (actions.length === 0) {
        actions.push({ 
          tool: 'web_search', 
          args: { query: input.slice(0, 100) } 
        });
      }
      
      // Execute actions sequentially
      const results: any[] = [];
      for (const action of actions) {
        if (toolMap[action.tool]) {
          try {
            const result = await toolMap[action.tool]!.call(action.args);
            results.push(result);
          } catch (error) {
            console.log(`  ⚠️  Tool execution failed: ${(error as Error).message}`);
            results.push({ error: (error as Error).message });
          }
        }
      }
      
      return {
        output: `Completed ${actions.length} actions with Vienna OS governance. Results logged to audit trail.`
      };
    }
  };
}

// ─── Demo Scenarios ────────────────────────────────────────────────────────

async function runDemo() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           Vienna OS + LangChain Integration               ║
║        Governed AI Agents with Policy Enforcement        ║
╚══════════════════════════════════════════════════════════╝
`);

  // Register agent with Vienna OS
  try {
    await vienna.register({
      name: 'LangChain Demo Agent',
      capabilities: 'web_search,send_slack,export_data',
      framework: 'langchain',
      version: '1.0.0'
    });
    console.log('✅ Agent registered with Vienna OS fleet management\n');
  } catch (error) {
    console.log('⚠️  Agent registration skipped (demo mode)\n');
  }

  // Create governed tools
  const tools: Tool[] = [
    governedTool('web_search', webSearchTool),
    governedTool('send_slack', slackTool), 
    governedTool('export_data', exportTool),
    governedTool('delete_records', adminTool),
  ];

  // Create agent with governed tools
  const agent = createMockAgent(tools);

  // Demo scenarios
  const scenarios = [
    {
      name: 'T0 Auto-Approved: Web Search',
      input: 'Search for AI governance best practices',
      description: 'Web searches are classified as T0 (no risk) and auto-approved'
    },
    {
      name: 'T1 Policy-Approved: Team Communication',
      input: 'Search for governance info and share findings with the team',
      description: 'Internal Slack messages are T1 and approved by policy'
    },
    {
      name: 'T2 Human Approval Required: Data Export',
      input: 'Export user data for analysis',
      description: 'Large data exports require human approval (T2)'
    },
    {
      name: 'DENIED: Admin Action Outside Scope',
      input: 'Delete old temporary records to clean up space',
      description: 'Agent lacks admin privileges, action denied'
    }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]!;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scenario ${i + 1}: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const result = await agent.invoke({ input: scenario.input });
      console.log(`\n  🎯 Result: ${result.output}`);
    } catch (error) {
      console.log(`\n  ⚠️  Scenario result: ${(error as Error).message}`);
    }
    
    // Pause between scenarios
    if (i < scenarios.length - 1) {
      console.log('\n⏸️  Pausing 2 seconds before next scenario...');
      await simulateDelay(2000);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`
✅ LangChain + Vienna OS integration demo complete!

Key takeaways:
• Every tool call goes through governance before execution
• Risk tiers (T0/T1/T2/T3) determine approval requirements  
• Denied actions are logged and agents are flagged
• Full audit trail maintained for compliance
• Works with existing LangChain code via simple wrapper

Next steps:
• Configure policies in the Vienna console
• Set up human approval workflows
• Add more tools with custom governance rules
• Deploy to production with real API keys

Documentation: https://regulator.ai/docs/integrations/langchain
`);
}

// ─── Utilities ──────────────────────────────────────────────────────────────

async function simulateDelay(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});