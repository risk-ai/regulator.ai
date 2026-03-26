/**
 * LangChain Integration Example
 * 
 * This example demonstrates how to wrap LangChain tools with Vienna OS governance.
 * All tool calls go through the governance pipeline before execution.
 */

import { createForLangChain } from '@vienna-os/sdk';

// Simulated LangChain tool interface
interface LangChainTool {
  name: string;
  description: string;
  call: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * Wrapper that adds Vienna governance to LangChain tools
 */
class GovernedLangChainTool implements LangChainTool {
  private vienna = createForLangChain({
    apiKey: process.env.VIENNA_API_KEY!,
    agentId: 'langchain-wrapper',
  });

  constructor(
    public name: string,
    public description: string,
    private originalTool: LangChainTool,
  ) {}

  async call(args: Record<string, unknown>): Promise<string> {
    console.log(`🔒 Submitting ${this.name} for governance review...`);
    
    try {
      // Submit the tool call for governance
      const result = await this.vienna.submitToolIntent(
        this.name,
        args,
        {
          description: this.description,
          framework: 'langchain',
        }
      );

      console.log(`📊 Governance result: ${result.status} (${result.riskTier})`);

      // If pending approval, wait for it
      if (result.status === 'pending_approval') {
        console.log('⏳ Waiting for approval...');
        const finalStatus = await this.vienna.waitForApproval(result.intentId, 60000); // 1 minute timeout
        
        if (finalStatus !== 'executed') {
          throw new Error(`Tool call ${this.name} was ${finalStatus}`);
        }
      } else if (result.status === 'denied') {
        throw new Error(`Tool call ${this.name} was denied by governance`);
      }

      // Execute the original tool
      console.log(`⚡ Executing ${this.name}...`);
      const toolResult = await this.originalTool.call(args);

      // Report successful execution back to Vienna
      await this.vienna.reportExecution(result.intentId, 'success', {
        result_length: toolResult.length,
        execution_time: Date.now(),
      });

      return toolResult;

    } catch (error) {
      console.error(`❌ Error in governed tool ${this.name}:`, error);
      throw error;
    }
  }
}

// Example LangChain tools
const webSearchTool: LangChainTool = {
  name: 'web_search',
  description: 'Search the web for information',
  call: async (args) => {
    const query = args.query as string;
    console.log(`🔍 Searching for: ${query}`);
    // Simulated web search
    return `Search results for "${query}": 1. Example result 1. 2. Example result 2.`;
  },
};

const emailTool: LangChainTool = {
  name: 'send_email',
  description: 'Send an email message',
  call: async (args) => {
    const { to, subject, body } = args;
    console.log(`📧 Sending email to ${to}: ${subject}`);
    // Simulated email sending
    return `Email sent successfully to ${to}`;
  },
};

const fileWriteTool: LangChainTool = {
  name: 'write_file',
  description: 'Write data to a file',
  call: async (args) => {
    const { filename, content } = args;
    console.log(`💾 Writing to file: ${filename}`);
    // Simulated file writing
    return `File ${filename} written successfully`;
  },
};

async function demonstrateLangChainIntegration() {
  console.log('🦜 LangChain + Vienna OS Integration Demo\n');

  // Create governed versions of the tools
  const governedWebSearch = new GovernedLangChainTool('web_search', 'Search the web', webSearchTool);
  const governedEmail = new GovernedLangChainTool('send_email', 'Send email', emailTool);
  const governedFileWrite = new GovernedLangChainTool('write_file', 'Write to file', fileWriteTool);

  try {
    // Register the agent with Vienna
    const vienna = createForLangChain({
      apiKey: process.env.VIENNA_API_KEY!,
      agentId: 'langchain-demo',
    });
    await vienna.register({ version: '1.0.0', environment: 'demo' });

    // Example 1: Low-risk web search (should execute immediately)
    console.log('📍 Example 1: Web search (low risk)');
    const searchResult = await governedWebSearch.call({
      query: 'what is artificial intelligence',
    });
    console.log('Result:', searchResult.substring(0, 100) + '...\n');

    // Example 2: Medium-risk email (might require approval)
    console.log('📍 Example 2: Email sending (medium risk)');
    const emailResult = await governedEmail.call({
      to: 'user@example.com',
      subject: 'Test from LangChain',
      body: 'This is a test email sent through the governed LangChain tool.',
    });
    console.log('Result:', emailResult + '\n');

    // Example 3: High-risk file write (likely requires approval)
    console.log('📍 Example 3: File write (high risk)');
    const fileResult = await governedFileWrite.call({
      filename: '/tmp/sensitive_data.txt',
      content: 'This contains sensitive information that requires approval.',
    });
    console.log('Result:', fileResult + '\n');

    console.log('✅ All tools executed successfully through Vienna governance!');

  } catch (error) {
    console.error('💥 Demo failed:', error);
    
    if (error instanceof Error && error.message.includes('denied')) {
      console.log('💡 Tip: The action was blocked by governance policy. This is expected behavior for high-risk actions.');
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  demonstrateLangChainIntegration().catch(console.error);
}