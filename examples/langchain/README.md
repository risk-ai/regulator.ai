# Vienna OS + LangChain Integration

This example demonstrates how to integrate Vienna OS governance with a LangChain agent. It shows how AI agents can submit intents to Vienna OS before executing tools, ensuring all actions are governed by policies and human approvals when required.

## What This Does

- **Wraps LangChain tools** with Vienna OS governance
- **Submits intents** before tool execution for policy evaluation
- **Handles approval workflows** for high-risk T2/T3 actions
- **Provides audit trails** for all agent activities
- **Demonstrates warrant verification** and execution reporting

## Prerequisites

- Node.js 18+
- Vienna OS API key (`vna_xxx`)
- LangChain library

## Installation

```bash
# From the examples/langchain directory
npm install

# Set your Vienna OS API key
export VIENNA_API_KEY=vna_your_api_key_here
```

## Quick Start

```bash
# Run the example
node index.js

# Or use TypeScript
npm run dev
```

## How It Works

### 1. Intent Submission

Before executing any tool, the LangChain agent submits an intent to Vienna OS:

```typescript
const result = await vienna.submitToolIntent('web_search', {
  query: 'latest AI governance regulations',
  max_results: 5
});
```

### 2. Governance Pipeline

Vienna OS processes the intent through its governance pipeline:
- **Policy Engine**: Evaluates against configured policies
- **Risk Assessment**: Assigns risk tier (T0/T1/T2/T3)
- **Approval Gate**: Routes to human approval if required
- **Warrant Issuance**: Creates cryptographic proof of authorization

### 3. Conditional Execution

The agent only executes the tool if Vienna OS approves:

```typescript
if (result.status === 'approved' || result.status === 'auto-approved') {
  // Execute the tool with Vienna's warrant
  const toolResult = await executeTool(toolName, args);
  
  // Report execution success/failure
  await vienna.reportExecution(result.execution_id, 'success', { 
    result: toolResult 
  });
}
```

## Example Scenarios

The demo includes several realistic scenarios:

### T0 (Auto-Approved): Web Search
```javascript
// Policy: web searches are always safe → auto-approve
await agent.search("AI governance trends");
// Result: Immediate execution, no human approval needed
```

### T1 (Policy-Approved): Send Notification  
```javascript
// Policy: notifications to internal channels → auto-approve
await agent.sendSlack("#engineering", "Deployment complete");
// Result: Policy approves, warrant issued, executed
```

### T2 (Human Approval): Data Export
```javascript
// Policy: data exports > 1000 records → require approval
await agent.exportData({ table: "users", limit: 5000 });
// Result: Pending human approval, execution waits
```

### Denied: Scope Violation
```javascript
// Policy: agent scope is read-only, not admin
await agent.deleteRecords({ table: "users" });
// Result: Denied, agent flagged, security notified
```

## Policy Examples

The example includes sample policies that demonstrate different risk tiers:

```yaml
# Low-risk tools (T0 - Auto-approved)
- name: "Web Search Policy"
  conditions:
    - field: "tool_name"
      operator: "equals"
      value: "web_search"
  actions: ["auto_approve"]
  tier: "T0"

# Medium-risk tools (T1 - Policy approval)
- name: "Internal Communications" 
  conditions:
    - field: "tool_name"
      operator: "equals"
      value: "send_slack"
    - field: "tool_args.channel"
      operator: "starts_with"
      value: "#"
  actions: ["approve"]
  tier: "T1"

# High-risk tools (T2 - Human approval)
- name: "Data Export Policy"
  conditions:
    - field: "tool_name"
      operator: "equals"
      value: "export_data"
    - field: "tool_args.limit"
      operator: "greater_than"
      value: 1000
  actions: ["require_approval"]
  tier: "T2"
```

## Configuration

### Environment Variables

```bash
# Required: Vienna OS API key
VIENNA_API_KEY=vna_your_api_key_here

# Optional: Vienna OS API URL (defaults to production)
VIENNA_API_URL=https://api.vienna-os.dev

# Optional: Agent identification
AGENT_ID=langchain-demo-agent
```

### LangChain Tool Registration

```typescript
import { createForLangChain } from '@vienna-os/sdk';

const vienna = createForLangChain({
  apiKey: process.env.VIENNA_API_KEY!,
  agentId: 'langchain-demo-agent',
});

// Register your agent capabilities
await vienna.register({
  name: 'LangChain Demo Agent',
  capabilities: 'web_search,send_slack,export_data',
  framework: 'langchain',
  version: '0.1.0'
});
```

## Code Walkthrough

### Main Agent Loop

```typescript
async function runGoverned LangChainAgent() {
  // 1. Register with Vienna OS
  await vienna.register({ name: 'Demo Agent' });

  // 2. Define tools with governance wrapper
  const tools = [
    governedTool('web_search', webSearchTool),
    governedTool('send_slack', slackTool),
    governedTool('export_data', exportTool),
  ];

  // 3. Create LangChain agent with governed tools
  const agent = createAgent(model, tools);

  // 4. Execute with automatic governance
  const result = await agent.invoke({
    input: "Search for AI governance trends and share findings with the team"
  });
}
```

### Tool Governance Wrapper

```typescript
function governedTool(name: string, originalTool: Tool): Tool {
  return {
    name,
    description: originalTool.description,
    async call(args: any) {
      // Submit intent to Vienna OS
      const intent = await vienna.submitToolIntent(name, args);
      
      if (intent.status === 'approved' || intent.status === 'auto-approved') {
        try {
          // Execute the original tool
          const result = await originalTool.call(args);
          
          // Report successful execution
          await vienna.reportExecution(intent.execution_id, 'success', { 
            result: typeof result === 'string' ? { output: result } : result 
          });
          
          return result;
        } catch (error) {
          // Report failed execution
          await vienna.reportExecution(intent.execution_id, 'failure', {
            error: error.message
          });
          throw error;
        }
      } else if (intent.status === 'pending') {
        throw new Error(`Action requires approval. View at: ${intent.poll_url}`);
      } else {
        throw new Error(`Action denied: ${intent.reason || 'Policy violation'}`);
      }
    }
  };
}
```

## Next Steps

1. **Customize Policies**: Modify the governance rules to match your use case
2. **Add More Tools**: Integrate additional LangChain tools with governance
3. **Set Up Approvers**: Configure human approval workflows in the Vienna console
4. **Monitor Fleet**: Track agent activities and policy violations
5. **Production Deploy**: Scale to production with proper API keys and monitoring

## Learn More

- [Vienna OS Documentation](https://regulator.ai/docs)
- [LangChain Documentation](https://langchain.com/docs)
- [Policy Configuration Guide](https://regulator.ai/docs/policies)
- [Approval Workflows](https://regulator.ai/docs/approvals)
- [Vienna OS Console](https://console.regulator.ai)

## Support

- Issues: [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- Community: [Discord](https://discord.gg/vienna-os)
- Email: support@regulator.ai