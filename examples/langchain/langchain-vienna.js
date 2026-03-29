#!/usr/bin/env node
/**
 * LangChain + Vienna OS Integration Example
 * Demonstrates governed tool execution with approval workflows
 */

import { ChatOpenAI } from '@langchain/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';

// Mock Vienna SDK (replace with actual vienna-sdk import)
class ViennaGovernor {
  constructor(config) {
    this.tenant = config.tenant;
    this.apiKey = config.apiKey;
    this.simulation = process.env.VIENNA_SIMULATION === 'true';
  }

  async submitIntent(intent) {
    console.log(`[Vienna] Submitting intent: ${intent.action}`);
    
    if (this.simulation) {
      console.log('[Vienna] SIMULATION MODE - No real execution');
      return {
        intent_id: `intent_${Date.now()}`,
        execution_id: `exec_${Date.now()}`,
        status: 'approved',
        risk_tier: intent.risk_tier
      };
    }

    // Real Vienna SDK would call POST /api/v1/intent here
    const response = await fetch(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/intent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tenant_id: this.tenant,
        action: intent.action,
        parameters: intent.parameters,
        risk_tier: intent.risk_tier
      })
    });

    return await response.json();
  }

  async waitForExecution(executionId) {
    if (this.simulation) {
      return {
        success: true,
        output: `[Simulated result for ${executionId}]`,
        attestation_id: `att_${Date.now()}`
      };
    }

    // Poll for execution result
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${process.env.VIENNA_API_URL || 'http://localhost:3100'}/api/v1/execution/${executionId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const result = await response.json();
      
      if (result.status === 'completed' || result.status === 'failed') {
        return {
          success: result.status === 'completed',
          output: result.output,
          reason: result.failure_reason,
          attestation_id: result.attestation_id
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Execution timeout');
  }
}

// Initialize Vienna governance
const governor = new ViennaGovernor({
  tenant: process.env.VIENNA_TENANT || 'langchain-demo',
  apiKey: process.env.VIENNA_API_KEY || 'demo-key'
});

// Example: Governed web search tool
const governedSearchTool = new DynamicTool({
  name: 'search',
  description: 'Search the web for information. Input should be a search query.',
  func: async (query) => {
    console.log(`[Tool] search called with: ${query}`);

    // Submit intent to Vienna
    const intent = await governor.submitIntent({
      action: 'web_search',
      parameters: { query },
      risk_tier: 'T0' // Read-only, auto-approve
    });

    // Wait for governance decision
    const result = await governor.waitForExecution(intent.execution_id);

    if (!result.success) {
      throw new Error(`Vienna denied: ${result.reason}`);
    }

    // Simulate search result (replace with actual search API)
    const mockResult = `Search results for "${query}": 
    1. Paris is the capital of France
    2. Population: ~2.2 million
    3. Located on the Seine river`;

    return mockResult;
  }
});

// Example: Governed calculator tool
const governedCalculatorTool = new DynamicTool({
  name: 'calculator',
  description: 'Perform calculations. Input should be a math expression.',
  func: async (expression) => {
    console.log(`[Tool] calculator called with: ${expression}`);

    const intent = await governor.submitIntent({
      action: 'calculate',
      parameters: { expression },
      risk_tier: 'T0'
    });

    const result = await governor.waitForExecution(intent.execution_id);

    if (!result.success) {
      throw new Error(`Vienna denied: ${result.reason}`);
    }

    // Safe eval for demo (replace with proper math parser)
    try {
      const answer = eval(expression);
      return `${expression} = ${answer}`;
    } catch (error) {
      return `Error calculating: ${error.message}`;
    }
  }
});

// Main execution
async function main() {
  console.log('=== LangChain + Vienna OS Integration Demo ===\n');

  // Initialize LangChain model
  const model = new ChatOpenAI({
    temperature: 0,
    modelName: 'gpt-4',
    openAIApiKey: process.env.OPENAI_API_KEY || 'demo-key'
  });

  // Create agent with governed tools
  const tools = [governedSearchTool, governedCalculatorTool];

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: 'zero-shot-react-description',
    verbose: true,
    maxIterations: 3
  });

  // Test query
  const query = 'What is the capital of France and what is 2+2?';
  
  console.log(`\nQuery: ${query}\n`);

  try {
    const response = await executor.invoke({ input: query });
    console.log('\n=== Agent Response ===');
    console.log(response.output);
  } catch (error) {
    console.error('\n=== Error ===');
    console.error(error.message);
  }

  console.log('\n=== Demo Complete ===');
  console.log('All tool calls were governed by Vienna OS');
  console.log('Check Vienna console for audit trail + attestations');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ViennaGovernor, governedSearchTool, governedCalculatorTool };
