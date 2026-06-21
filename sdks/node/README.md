# @vienna-os/client

[![npm](https://img.shields.io/npm/v/@vienna-os/client)](https://www.npmjs.com/package/@vienna-os/client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

Official Node.js / TypeScript SDK for the [Vienna OS](https://regulator.ai) AI governance platform.

---

## Installation

```bash
npm install @vienna-os/client
# or
yarn add @vienna-os/client
# or
pnpm add @vienna-os/client
```

Requires Node.js 18+ (for native `fetch` support).

---

## Quick Start

```typescript
import { ViennaOS } from '@vienna-os/client';

const client = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

const proposal = await client.submitProposal({
  agentId: 'agent-your-id',
  action: 'send_email',
  payload: {
    to: 'user@example.com',
    subject: 'Your report is ready',
  },
});

console.log(proposal.state); // 'approved' | 'pending' | 'denied'

if (proposal.state === 'approved' && proposal.warrant) {
  console.log('Warrant ID:', proposal.warrant.id);
  console.log('Expires:', proposal.warrant.expires_at);
  // Execute the action — warrant is proof of approval
}
```

---

## API Reference

### `new ViennaOS(options)`

| Option      | Type     | Default                          | Description              |
|-------------|----------|----------------------------------|--------------------------|
| `apiKey`    | `string` | required                         | Tenant API key           |
| `baseUrl`   | `string` | `https://console.regulator.ai`   | Console proxy URL        |
| `timeoutMs` | `number` | `30_000`                         | HTTP timeout in ms       |

---

### `client.submitProposal(opts)`

Submit an agent action for governance evaluation.

```typescript
const proposal = await client.submitProposal({
  agentId: 'agent-abc',        // required
  action: 'delete_records',    // required
  payload: { table: 'users' }, // optional
  simulation: false,           // dry-run mode
  riskTier: 2,                 // override (0=auto, 1-3=explicit)
});
```

**Returns:** `Promise<Proposal>`

---

### `client.getWarrant(proposalId)`

Retrieve the approval warrant for a given proposal.

```typescript
const warrant = await client.getWarrant(proposal.id);
console.log(warrant.signature);
```

**Returns:** `Promise<Warrant>`

---

### `client.listPolicies(opts?)`

List governance policies for the tenant.

```typescript
const policies = await client.listPolicies({ enabled: true, limit: 20 });
for (const p of policies) {
  console.log(p.id, p.name);
}
```

**Returns:** `Promise<Policy[]>`

---

### `client.createPolicy(opts)`

Create a new governance policy.

```typescript
const policy = await client.createPolicy({
  name: 'PII Guard',
  description: 'Block unauthorized PII writes',
  conditions: { pii_write: { type: 'action_matches', pattern: 'write_pii*' } },
  actions: { pii_write: 'deny' },
  priority: 10,
  enabled: true,
  tags: ['privacy', 'gdpr'],
});
```

**Returns:** `Promise<Policy>`

---

### `client.updatePolicy(policyId, patch)` / `client.deletePolicy(policyId)`

```typescript
await client.updatePolicy('pol-001', { enabled: false });
await client.deletePolicy('pol-001');
```

---

## Error Handling

```typescript
import { ViennaOSError } from '@vienna-os/client';

try {
  const warrant = await client.getWarrant('unknown-id');
} catch (err) {
  if (err instanceof ViennaOSError) {
    console.error('Status:', err.statusCode); // e.g. 404
    console.error('Message:', err.message);   // 'Not found'
    console.error('Response:', err.response); // raw response body
  }
}
```

---

## LangChain / LangGraph Integration

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ViennaOS } from '@vienna-os/client';

const viennaClient = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

const governedEmailTool = tool(
  async ({ to, subject, body }) => {
    const proposal = await viennaClient.submitProposal({
      agentId: 'langchain-agent',
      action: 'send_email',
      payload: { to, subject, body },
    });

    if (proposal.state === 'denied') {
      return `Email blocked by policy: ${proposal.error ?? 'policy violation'}`;
    }
    if (proposal.state === 'pending') {
      return `Email pending approval (proposal: ${proposal.id})`;
    }
    // state === 'approved' — execute email send with warrant proof
    return `Email approved. Warrant: ${proposal.warrant?.id}`;
  },
  {
    name: 'send_governed_email',
    description: 'Send an email through Vienna OS governance',
    schema: z.object({
      to: z.string().email(),
      subject: z.string(),
      body: z.string(),
    }),
  }
);
```

---

## Building & Testing (for contributors)

```bash
cd sdks/node
npm install
npm run build    # TypeScript compile → dist/
npm test         # vitest
```

---

## Publishing (for maintainers)

```bash
# Build first
npm run build

# Test on npm (dry-run)
npm publish --dry-run

# Publish (npm credentials required — Max/Whit)
npm publish --access public
```

---

## License

MIT — see [LICENSE](../../LICENSE)
