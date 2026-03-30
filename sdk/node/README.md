# Vienna OS SDK (Node.js)

> The execution kernel for AI agents. Agents propose. Vienna OS decides.

## Install

```bash
npm install vienna-os
```

## Quick Start

```typescript
import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  agentId: 'your-agent-id',
  apiKey: 'vos_...',
});

// Submit an intent through the governance pipeline
const result = await vienna.submitIntent({
  action: 'deploy',
  payload: { service: 'api-gateway', version: 'v2.4.1' },
});

console.log(result.pipeline);
// "executed" — action was auto-approved (T0) and warrant issued
// "pending_approval" — requires operator approval (T1/T2)
// "denied" — blocked by policy
// "simulated" — dry run, no side effects

if (result.warrant) {
  console.log('Warrant:', result.warrant.id);
  console.log('Signature:', result.warrant.signature);
  console.log('Expires:', result.warrant.expires_at);
}
```

## Simulation Mode

Test policy evaluation without executing:

```typescript
const dryRun = await vienna.simulate({
  action: 'delete_database',
  payload: { target: 'production' },
});

console.log(dryRun.policy_evaluation.matched_rule); // "Block destructive actions"
console.log(dryRun.pipeline); // "simulated"
```

## Approvals

```typescript
// Approve a pending proposal (operator action)
const { warrant } = await vienna.approveProposal('proposal-id', 'operator@company.com');

// Deny with reason
await vienna.denyProposal('proposal-id', 'Not approved for production');

// Verify a warrant before execution
const verification = await vienna.verifyWarrant(warrant.id, warrant.signature);
console.log(verification.valid); // true
```

## Error Handling

```typescript
import { PolicyDeniedError, WarrantExpiredError } from 'vienna-os';

try {
  await vienna.submitIntent({ action: 'deploy' });
} catch (err) {
  if (err instanceof PolicyDeniedError) {
    console.log('Blocked by:', err.rule);
  }
}
```

## License

BSL 1.1 — converts to Apache 2.0 in 2030.

Built by [ai.ventures](https://ai.ventures) at [regulator.ai](https://regulator.ai).
