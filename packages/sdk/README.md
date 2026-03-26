# @vienna/sdk

Official TypeScript SDK for **Vienna OS** — the AI Agent Governance Platform.

Submit intents, manage policies, govern your fleet, and stay compliant — all with full type safety and zero runtime dependencies.

## Installation

```bash
npm install @vienna/sdk
```

## Quick Start

```typescript
import { ViennaClient } from '@vienna/sdk';

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
```

## Modules

### Intent Submission

Submit agent actions through the governance pipeline, check status, or simulate dry-runs.

```typescript
// Submit
const result = await vienna.intent.submit({ action, source, payload });

// Check status
const status = await vienna.intent.status('int-abc123');

// Dry-run simulation
const sim = await vienna.intent.simulate({ action, source, payload });
```

### Policy Management

Create, update, and evaluate governance policies.

```typescript
// List policies
const policies = await vienna.policies.list({ enabled: true });

// Create a policy
const rule = await vienna.policies.create({
  name: 'High-Value Transfer Gate',
  conditions: [
    { field: 'action_type', operator: 'equals', value: 'financial_transaction' },
    { field: 'amount', operator: 'gt', value: 10000 },
  ],
  actionOnMatch: 'require_approval',
  approvalTier: 'T2',
  priority: 100,
});

// Evaluate policies against test data
const evaluation = await vienna.policies.evaluate({ action_type: 'wire_transfer', amount: 75000 });

// Browse industry templates
const templates = await vienna.policies.templates();
```

### Fleet Management

Monitor agents, manage trust scores, handle alerts.

```typescript
const fleet = await vienna.fleet.list();
const agent = await vienna.fleet.get('billing-bot');
const metrics = await vienna.fleet.metrics('billing-bot');

await vienna.fleet.suspend('billing-bot', { reason: 'Suspicious activity' });
await vienna.fleet.activate('billing-bot');
await vienna.fleet.setTrust('billing-bot', { score: 75, reason: 'Manual review passed' });

const alerts = await vienna.fleet.alerts({ resolved: false });
await vienna.fleet.resolveAlert('alert-123', { resolvedBy: 'operator-jane' });
```

### Approval Workflows

List, approve, or deny pending actions.

```typescript
const pending = await vienna.approvals.list({ status: 'pending' });

await vienna.approvals.approve('appr-123', {
  operator: 'jane',
  notes: 'Verified with finance team',
});

await vienna.approvals.deny('appr-456', {
  operator: 'jane',
  reason: 'Exceeds quarterly budget',
});
```

### Integrations

Connect Slack, webhooks, PagerDuty, and more.

```typescript
await vienna.integrations.create({
  type: 'slack',
  name: 'Ops Channel',
  config: { webhook_url: 'https://hooks.slack.com/...' },
  eventTypes: ['approval_required', 'policy_violation'],
});

const test = await vienna.integrations.test('int-123');
await vienna.integrations.toggle('int-123', { enabled: false });
```

### Compliance Reporting

Generate reports and track compliance metrics.

```typescript
const report = await vienna.compliance.generate({
  type: 'quarterly',
  periodStart: '2026-01-01',
  periodEnd: '2026-03-31',
});

const data = await vienna.compliance.get(report.id);
const stats = await vienna.compliance.quickStats({ days: 30 });
```

## Configuration

| Option    | Type       | Default                        | Description                     |
| --------- | ---------- | ------------------------------ | ------------------------------- |
| `apiKey`  | `string`   | *required*                     | Your Vienna API key (`vna_...`) |
| `baseUrl` | `string`   | `https://vienna-os.fly.dev`    | API base URL                    |
| `timeout` | `number`   | `30000`                        | Request timeout (ms)            |
| `retries` | `number`   | `3`                            | Auto-retries on 429/5xx        |
| `onError` | `function` | `undefined`                    | Global error callback           |

## Error Handling

All errors extend `ViennaError` with typed subclasses:

```typescript
import { ViennaError, ViennaAuthError, ViennaRateLimitError } from '@vienna/sdk';

try {
  await vienna.intent.submit({ /* ... */ });
} catch (error) {
  if (error instanceof ViennaAuthError) {
    console.error('Invalid API key');
  } else if (error instanceof ViennaRateLimitError) {
    console.error(`Rate limited — retry after ${error.retryAfter}s`);
  } else if (error instanceof ViennaError) {
    console.error(`[${error.code}] ${error.message}`, error.status);
  }
}
```

| Error Class              | HTTP Status | When                              |
| ------------------------ | ----------- | --------------------------------- |
| `ViennaValidationError`  | 400         | Invalid request parameters        |
| `ViennaAuthError`        | 401         | Missing or invalid API key        |
| `ViennaForbiddenError`   | 403         | Insufficient permissions          |
| `ViennaNotFoundError`    | 404         | Resource doesn't exist            |
| `ViennaRateLimitError`   | 429         | Too many requests                 |
| `ViennaServerError`      | 5xx         | Server-side error                 |

## TypeScript

Built with TypeScript strict mode. All methods, parameters, and return types are fully typed. Import types directly:

```typescript
import type { IntentRequest, PolicyRule, FleetAgent } from '@vienna/sdk';
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- No runtime dependencies

## Examples

See the [`examples/`](./examples/) directory:

- **[quick-start.ts](./examples/quick-start.ts)** — Basic intent submission
- **[custom-policy.ts](./examples/custom-policy.ts)** — Create and test policies
- **[multi-agent.ts](./examples/multi-agent.ts)** — Multi-agent fleet governance
- **[webhook-handler.ts](./examples/webhook-handler.ts)** — Webhook event processing

## License

MIT — see [LICENSE](../../LICENSE) for details.

---

**Vienna OS** — Governance infrastructure for the AI agent economy.  
[Documentation](https://vienna-os.fly.dev/docs) · [Dashboard](https://vienna-os.fly.dev) · [GitHub](https://github.com/risk-ai/regulator.ai)
