# @vienna-os/sdk

Official TypeScript SDK for **Vienna OS** — the AI Agent Governance Platform.

Submit intents, manage policies, govern your fleet, and stay compliant — all with full type safety and zero runtime dependencies.

[![npm version](https://badge.fury.io/js/@vienna-os%2Fsdk.svg)](https://www.npmjs.com/package/@vienna-os/sdk)
[![License: BSL-1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](../../LICENSE)

## Installation

```bash
npm install @vienna-os/sdk
```

## Quick Start

```typescript
import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  apiKey: process.env.VIENNA_API_KEY!,
});

// Submit an agent intent through the governance pipeline
const result = await vienna.intent.submit({
  action: 'wire_transfer',
  source: 'billing-bot',
  payload: {
    amount: 75000,
    currency: 'USD',
    recipient: 'vendor-123',
  },
});

console.log(result.status);      // 'executed' | 'pending_approval' | 'denied'
console.log(result.riskTier);    // 'T0' | 'T1' | 'T2' | 'T3'
console.log(result.auditId);     // Every action is audited
console.log(result.warrant);     // Cryptographic proof of authorization

// Handle warrant-based governance flow
if (result.status === 'pending_approval') {
  console.log('Waiting for human approval...');
  console.log(`View at: https://console.regulator.ai/approvals/${result.intentId}`);
}
```

## Framework Integration

Vienna OS provides convenience wrappers for popular AI agent frameworks:

### LangChain

```typescript
import { createForLangChain } from '@vienna-os/sdk';

const vienna = createForLangChain({
  apiKey: process.env.VIENNA_API_KEY!,
  agentId: 'langchain-bot',
});

// Submit tool calls through governance
const result = await vienna.submitToolIntent('web_search', {
  query: 'AI governance best practices',
});

// Wait for T2/T3 approvals
if (result.status === 'pending_approval') {
  const status = await vienna.waitForApproval(result.intentId);
  console.log(`Final status: ${status}`);
}
```

### CrewAI

```typescript
import { createForCrewAI } from '@vienna-os/sdk';

const vienna = createForCrewAI({
  apiKey: process.env.VIENNA_API_KEY!,
  agentId: 'crew-researcher',
});

const result = await vienna.submitTaskIntent('market_research', {
  topic: 'AI governance trends',
  depth: 'comprehensive',
});
```

### AutoGen

```typescript
import { createForAutoGen } from '@vienna-os/sdk';

const vienna = createForAutoGen({
  apiKey: process.env.VIENNA_API_KEY!,
  agentId: 'autogen-assistant',
});

const result = await vienna.submitConversationIntent('get_stock_price', {
  symbol: 'NVDA',
  exchange: 'NASDAQ',
});
```

### OpenClaw

```typescript
import { createForOpenClaw } from '@vienna-os/sdk';

const vienna = createForOpenClaw({
  apiKey: process.env.VIENNA_API_KEY!,
  agentId: 'openclaw-agent',
});

const result = await vienna.submitSkillIntent('web_search', {
  query: 'OpenAI news',
  max_results: 10,
});
```

## Risk Tiers

Vienna OS classifies all agent actions by risk level:

| Tier | Description | Examples | Approval Required |
|------|-------------|----------|-------------------|
| **T0** | Read-only, no external impact | View files, search web, read databases | No |
| **T1** | Low-risk writes, reversible | Create temp files, send notifications | No |
| **T2** | Medium-risk, business impact | Send emails, modify configs, API calls | Optional |
| **T3** | High-risk, significant impact | Financial transactions, delete data, deploy code | Yes |

## Core API

### Intent Submission

```typescript
// Submit and track intents
const result = await vienna.intent.submit({
  action: 'deploy_code',
  source: 'ci-bot',
  payload: { 
    repository: 'api-server',
    environment: 'production' 
  },
});

// Check status
const status = await vienna.intent.status('int-abc123');

// Simulate without executing (dry-run)
const simulation = await vienna.intent.simulate({
  action: 'wire_transfer',
  source: 'billing-bot',
  payload: { amount: 100000 },
});
```

### Policy Management

```typescript
// Create a new policy
await vienna.policies.create({
  name: 'High-Value Transfers',
  conditions: [{
    field: 'payload.amount',
    operator: 'greater_than',
    value: 50000,
  }],
  actions: ['require_approval'],
  riskTier: 'T3',
});

// List and evaluate policies
const policies = await vienna.policies.list({ enabled: true });
const evaluation = await vienna.policies.evaluate('pol-123', intentRequest);
```

### Approval Workflows

```typescript
// List pending approvals
const pending = await vienna.approvals.list({ status: 'pending' });

// Approve an action
await vienna.approvals.approve('appr-123', {
  operator: 'jane',
  notes: 'Verified with finance team',
});

// Deny an action
await vienna.approvals.deny('appr-456', {
  operator: 'jane',
  reason: 'Exceeds quarterly budget',
});
```

### Fleet Management

```typescript
// Monitor your agent fleet
const agents = await vienna.fleet.list();
const metrics = await vienna.fleet.metrics('agent-1');

// Manage agent status
await vienna.fleet.suspend('agent-1', { reason: 'Suspicious activity' });
await vienna.fleet.activate('agent-1');
```

### Compliance & Reporting

```typescript
// Generate compliance reports
const report = await vienna.compliance.generate({
  type: 'quarterly',
  periodStart: '2024-01-01',
  periodEnd: '2024-03-31',
});

// Get quick statistics
const stats = await vienna.compliance.quickStats({ days: 30 });
```

## Configuration

```typescript
const vienna = new ViennaClient({
  apiKey: 'vna_your_api_key',           // Required
  baseUrl: 'https://console.regulator.ai', // Optional
  timeout: 30000,                       // Optional, default 30s
  retries: 3,                          // Optional, default 3
  onError: (error) => {                // Optional global error handler
    console.error('Vienna error:', error);
  },
});
```

## Error Handling

The SDK provides detailed error types:

```typescript
import { 
  ViennaError, 
  ViennaAuthError, 
  ViennaRateLimitError 
} from '@vienna-os/sdk';

try {
  await vienna.intent.submit(intent);
} catch (error) {
  if (error instanceof ViennaAuthError) {
    console.error('Authentication failed');
  } else if (error instanceof ViennaRateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else if (error instanceof ViennaError) {
    console.error('Vienna API error:', error.code, error.message);
  }
}
```

## Examples

Check out the [examples directory](./examples/) for complete working examples:

- [`basic-usage.ts`](./examples/basic-usage.ts) — Simple intent submission and status checking
- [`langchain-integration.ts`](./examples/langchain-integration.ts) — Wrapping LangChain tools with governance
- [`approval-workflow.ts`](./examples/approval-workflow.ts) — T2/T3 approval polling and management

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import type { 
  IntentResult, 
  RiskTier, 
  PolicyRule,
  FleetAgent 
} from '@vienna-os/sdk';

const result: IntentResult = await vienna.intent.submit(intent);
const tier: RiskTier = result.riskTier; // Typed as 'T0' | 'T1' | 'T2' | 'T3'
```

## Documentation

- **Full Documentation**: [regulator.ai/docs](https://regulator.ai/docs)
- **Live Console**: [console.regulator.ai](https://console.regulator.ai)
- **API Reference**: [regulator.ai/docs/api](https://regulator.ai/docs/api)
- **Governance Guide**: [regulator.ai/docs/governance](https://regulator.ai/docs/governance)
- **Policy Examples**: [regulator.ai/docs/policies](https://regulator.ai/docs/policies)

## Support

- **Issues**: [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- **Documentation**: [regulator.ai/docs](https://regulator.ai/docs)
- **Email**: support@regulator.ai

## License

BSL-1.1 — See [LICENSE](./LICENSE) for details.