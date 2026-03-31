# Vienna OS SDK Examples

Practical examples demonstrating common Vienna OS integration patterns.

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
export VIENNA_BASE_URL="https://console.regulator.ai"
export VIENNA_AGENT_ID="your-agent-id"
export VIENNA_API_KEY="vos_..."

# Run examples with ts-node
npx ts-node examples/submit-intent.ts
```

## Examples

### 1. Submit Intent (`submit-intent.ts`)
Basic flow: submit an action through the governance pipeline.

```bash
npx ts-node examples/submit-intent.ts
```

**Use case:** Agent wants to deploy a service and needs governance approval.

---

### 2. Simulate Intent (`simulate-intent.ts`)
Test policy evaluation without execution (dry-run mode).

```bash
npx ts-node examples/simulate-intent.ts
```

**Use case:** Test what risk tier an action would be assigned before executing.

---

### 3. Approve Proposal (`approve-proposal.ts`)
Operator workflow: approve a pending proposal to issue a warrant.

```bash
npx ts-node examples/approve-proposal.ts prop_123
```

**Use case:** Human operator reviews and approves a high-risk action.

---

### 4. Audit Trail (`audit-trail.ts`)
Query governance events and system status.

```bash
npx ts-node examples/audit-trail.ts
```

**Use case:** Compliance reporting, debugging, or monitoring.

---

## Full Flow Example

```typescript
import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  agentId: 'my-agent-id',
  apiKey: 'vos_...',
});

// Step 1: Submit an intent
const result = await vienna.submitIntent({
  action: 'deploy',
  payload: { service: 'api-gateway', version: 'v2.0.0' },
});

// Step 2: Handle pipeline outcome
if (result.pipeline === 'executed') {
  console.log('Deployed with warrant:', result.warrant?.id);
} else if (result.pipeline === 'pending_approval') {
  console.log('Awaiting approval for proposal:', result.proposal?.id);
  
  // (Later) Operator approves the proposal
  const approval = await vienna.approveProposal(result.proposal.id, {
    reviewer: 'operator-1',
    reason: 'Reviewed and approved',
  });
  
  console.log('Warrant issued:', approval.warrant.id);
}

// Step 3: Verify warrant before execution
const verification = await vienna.verifyWarrant(result.warrant.id);
if (verification.valid) {
  console.log('Warrant is valid, proceed with execution');
}
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VIENNA_BASE_URL` | Vienna console URL | `https://console.regulator.ai` |
| `VIENNA_AGENT_ID` | Your agent identifier | `my-agent-id` |
| `VIENNA_API_KEY` | API key from console | `vos_...` |

## Getting an API Key

1. Sign up at [console.regulator.ai](https://console.regulator.ai)
2. Go to Settings → API Keys
3. Create a new key
4. Copy and save it (it won't be shown again)

## Next Steps

- **Production Integration:** See [integration guide](https://regulator.ai/docs/integration)
- **Policy Configuration:** [Policy templates](https://console.regulator.ai/policies)
- **Agent Templates:** [Agent setup](https://console.regulator.ai/agents)
- **API Reference:** [Full API docs](https://regulator.ai/docs/api)

## Support

- **Documentation:** https://regulator.ai/docs
- **Discord:** https://discord.gg/vienna-os
- **Email:** support@regulator.ai
