# LangChain + Vienna OS Integration

**Govern LangChain agents with Vienna OS execution warrants**

This example demonstrates how to wrap LangChain agents with Vienna OS governance, ensuring all tool executions are policy-checked, approved (if T1/T2), and attested.

---

## Architecture

```
┌──────────────┐
│  LangChain   │  (ReAct agent, tool calling)
│  Agent       │
└──────┬───────┘
       │ Tool invocation
       ▼
┌──────────────┐
│  Vienna      │  (Governance wrapper)
│  Tool Proxy  │
└──────┬───────┘
       │ Intent submission
       ▼
┌──────────────┐
│  Vienna OS   │  (Policy, approval, attestation)
│  Core        │
└──────┬───────┘
       │ Governed execution
       ▼
┌──────────────┐
│  Actual      │  (GitHub API, file system, etc.)
│  Tool        │
└──────────────┘
```

**Key insight:** Vienna OS intercepts tool calls before they execute, enforcing governance.

---

## Quick Start

```bash
# Install dependencies
cd ~/regulator.ai/examples/langchain
npm install

# Run example
node langchain-vienna.js
```

---

## Code Example

```javascript
// langchain-vienna.js
import { ChatOpenAI } from '@langchain/openai';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';
import { ViennaGovernor } from 'vienna-sdk';

// Initialize Vienna governance
const governor = new ViennaGovernor({
  tenant: 'langchain-demo',
  apiKey: process.env.VIENNA_API_KEY
});

// Original tool (ungoverned)
const searchTool = new DynamicTool({
  name: 'search',
  description: 'Search the web',
  func: async (query) => {
    // Actual search logic
    return await fetch(`https://api.search.com?q=${query}`);
  }
});

// Governed tool (Vienna wrapper)
const governedSearchTool = new DynamicTool({
  name: 'search',
  description: 'Search the web (Vienna-governed)',
  func: async (query) => {
    // Submit intent to Vienna
    const intent = await governor.submitIntent({
      action: 'web_search',
      parameters: { query },
      risk_tier: 'T0' // Read-only, auto-approve
    });

    // Wait for approval (if T1/T2)
    const result = await governor.waitForExecution(intent.execution_id);

    if (!result.success) {
      throw new Error(`Vienna denied: ${result.reason}`);
    }

    return result.output;
  }
});

// LangChain agent with governed tools
const model = new ChatOpenAI({ temperature: 0 });
const tools = [governedSearchTool];

const executor = await initializeAgentExecutorWithOptions(tools, model, {
  agentType: 'zero-shot-react-description',
  verbose: true
});

// Run agent (all tool calls go through Vienna)
const response = await executor.invoke({
  input: 'What is the capital of France?'
});

console.log(response.output);
```

---

## Governance Benefits

### Before Vienna OS (Ungoverned)
```javascript
// Direct tool execution - no oversight
const result = await searchTool.call('sensitive query');
```

**Risks:**
- ❌ No policy enforcement
- ❌ No approval workflow for risky actions
- ❌ No audit trail
- ❌ No cost tracking
- ❌ No attribution (who triggered the search?)

### After Vienna OS (Governed)
```javascript
// Vienna intercepts, evaluates policy, requires approval, attests
const result = await governedSearchTool.call('sensitive query');
```

**Protections:**
- ✅ Policy evaluation (deny if forbidden pattern)
- ✅ Approval workflow (T1/T2 require operator authorization)
- ✅ Audit trail (immutable attestation)
- ✅ Cost tracking (per-execution billing)
- ✅ Attribution (tenant + operator logged)

---

## Risk Tier Mapping

| LangChain Tool | Risk Tier | Approval Required |
|----------------|-----------|-------------------|
| Web search     | T0        | No (auto-approve) |
| Read file      | T0        | No                |
| List directory | T0        | No                |
| Write file     | T1        | Yes (operator)    |
| Delete file    | T2        | Yes (+ justification) |
| Execute shell  | T2        | Yes (+ rollback plan) |
| API mutation   | T1/T2     | Depends on API    |

**Policy example:**
```javascript
// Deny shell execution outright
{
  "policy_id": "deny-shell",
  "rule": "action === 'shell_execute'",
  "decision": "deny",
  "reason": "Shell execution forbidden in production"
}

// Require approval for file writes to /etc
{
  "policy_id": "sensitive-paths",
  "rule": "action === 'write_file' && parameters.path.startsWith('/etc')",
  "decision": "require_approval",
  "tier": "T2"
}
```

---

## Tool Wrapper Patterns

### Pattern 1: Simple Wrapper (Read-Only Tools)

```javascript
function wrapTool(originalTool, governor) {
  return new DynamicTool({
    name: originalTool.name,
    description: originalTool.description,
    func: async (input) => {
      const intent = await governor.submitIntent({
        action: originalTool.name,
        parameters: { input },
        risk_tier: 'T0'
      });

      const result = await governor.waitForExecution(intent.execution_id);
      if (!result.success) throw new Error(result.reason);
      
      return result.output;
    }
  });
}
```

### Pattern 2: Conditional Governance (Performance)

```javascript
function wrapTool(originalTool, governor, options = {}) {
  return new DynamicTool({
    name: originalTool.name,
    description: originalTool.description,
    func: async (input) => {
      // Skip governance for safe operations (performance optimization)
      if (options.skipGov && isSafeOperation(input)) {
        return await originalTool.call(input);
      }

      // Govern risky operations
      const intent = await governor.submitIntent({
        action: originalTool.name,
        parameters: { input },
        risk_tier: inferRiskTier(input)
      });

      const result = await governor.waitForExecution(intent.execution_id);
      return result.success ? result.output : Promise.reject(result.reason);
    }
  });
}
```

### Pattern 3: Batch Governance (Multi-Tool Chains)

```javascript
async function runGovernedChain(tools, inputs, governor) {
  // Submit all intents upfront
  const intents = await Promise.all(
    inputs.map((input, i) => 
      governor.submitIntent({
        action: tools[i].name,
        parameters: input,
        chain_id: `chain_${Date.now()}`
      })
    )
  );

  // Wait for all approvals in parallel
  const results = await Promise.all(
    intents.map(intent => governor.waitForExecution(intent.execution_id))
  );

  return results;
}
```

---

## Testing

```bash
# Run unit tests
npm test

# Run with Vienna in simulation mode (no real execution)
VIENNA_SIMULATION=true node langchain-vienna.js
```

**Test coverage:**
- ✅ Tool wrapper preserves LangChain interface
- ✅ T0 tools execute without approval
- ✅ T1 tools require approval
- ✅ T2 tools require approval + justification
- ✅ Policy denials block execution
- ✅ Attestations created for all executions
- ✅ Cost tracking functional

---

## Production Deployment

### 1. Configure Vienna OS

```bash
# Set tenant + API key
export VIENNA_TENANT="prod-langchain"
export VIENNA_API_KEY="vks_..."

# Configure policies
node setup-policies.js
```

### 2. Wrap All Tools

```javascript
// Wrap ALL LangChain tools at initialization
const tools = [
  searchTool,
  calculatorTool,
  fileReaderTool,
  apiTool
].map(tool => wrapTool(tool, governor));
```

### 3. Monitor Governance

```javascript
// Listen for governance events
governor.on('approval_required', (intent) => {
  console.log(`Approval needed: ${intent.action}`);
  // Notify operator via Slack/email
});

governor.on('execution_denied', (intent) => {
  console.error(`Denied: ${intent.action} - ${intent.reason}`);
  // Alert security team
});
```

---

## Comparison: LangChain Native vs Vienna-Governed

| Feature | LangChain Native | Vienna-Governed |
|---------|------------------|-----------------|
| Tool execution | Direct | Via governance pipeline |
| Policy enforcement | None | Automatic |
| Approval workflow | None | T1/T2 require approval |
| Audit trail | Optional (callbacks) | Immutable attestations |
| Cost tracking | Manual | Automatic per-execution |
| Attribution | None | Tenant + operator logged |
| Rollback | Manual | Automatic (if supported) |
| Safety guarantees | Developer discipline | Architectural enforcement |

---

## Advanced: Multi-Agent Coordination

```javascript
// Multiple LangChain agents, all governed by Vienna

const researchAgent = createAgent([governedSearchTool]);
const executionAgent = createAgent([governedFileWriteTool, governedApiTool]);

// Vienna coordinates approvals across agents
const coordinator = new ViennaCoordinator({
  agents: [researchAgent, executionAgent],
  policy: 'multi-agent-policy.json'
});

// Run coordinated workflow
const result = await coordinator.runWorkflow({
  objective: 'Research competitor and update pricing',
  steps: [
    { agent: 'research', action: 'search', params: { query: 'competitor pricing' } },
    { agent: 'execution', action: 'update_db', params: { table: 'pricing' }, depends_on: [0] }
  ]
});

// Vienna ensures:
// - Research completes before DB update
// - Both actions approved (if T1/T2)
// - Full audit trail of coordination
```

---

## References

- **Vienna SDK:** `npm install vienna-sdk`
- **LangChain:** https://langchain.com/
- **Governance Docs:** `../../CANONICAL_EXECUTION_PATH.md`
- **Policy Examples:** `../../policies/langchain-examples.json`

**For questions:** Escalate to Max/Metternich.
