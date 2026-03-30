# Vienna OS TypeScript SDK

Official TypeScript/JavaScript SDK for Vienna OS AI Agent Governance Platform.

## Installation

```bash
npm install @vienna-os/sdk
```

## Quick Start

```typescript
import { ViennaClient } from '@vienna-os/sdk';

// Initialize client
const client = new ViennaClient({
  email: 'user@example.com',
  password: 'your-password'
});

// Execute an action with governance
const result = await client.execute({
  action: 'send_email',
  agentId: 'marketing-agent',
  context: { to: 'customer@example.com' },
  tier: 'T0'
});

console.log(`Execution ID: ${result.execution_id}`);
console.log(`Status: ${result.status}`);
```

## Features

- ✅ Full TypeScript support with type definitions
- ✅ Promise-based async API
- ✅ Automatic error handling
- ✅ Real-time event streaming (SSE)
- ✅ All 46 API endpoints wrapped

## Usage

### Authentication

```typescript
// With email/password
const client = new ViennaClient({
  email: 'user@example.com',
  password: 'password'
});

// With API key
const client = new ViennaClient({
  apiKey: 'vos_your_api_key_here'
});
```

### Execute Actions

```typescript
// T0 - Auto-approved
const result = await client.execute({
  action: 'query_database',
  agentId: 'analytics-agent',
  tier: 'T0'
});

// T1 - Requires approval
const result = await client.execute({
  action: 'delete_records',
  agentId: 'admin-agent',
  tier: 'T1'
});

if (result.requires_approval) {
  console.log(`Waiting for approval: ${result.execution_id}`);
}
```

### Manage Approvals

```typescript
// Get pending approvals
const approvals = await client.getApprovals({ status: 'pending', tier: 'T1' });

for (const approval of approvals) {
  console.log(`${approval.approval_id}: ${approval.action_summary}`);
}

// Approve an action
await client.approve(
  'approval_123',
  'max@law.ai',
  'Approved after security review'
);

// Reject an action
await client.reject(
  'approval_456',
  'max@law.ai',
  'Insufficient justification'
);
```

### Real-time Events

```typescript
const eventSource = client.createEventStream(
  (event) => {
    console.log('New event:', event);
    
    if (event.type === 'execution_requested') {
      console.log(`New execution: ${event.execution_id}`);
    }
  },
  (error) => {
    console.error('Event stream error:', error);
  }
);

// Close stream when done
eventSource.close();
```

### Error Handling

```typescript
import {
  ViennaError,
  AuthenticationError,
  ValidationError,
  NotFoundError
} from '@vienna-os/sdk';

try {
  await client.execute({
    action: 'risky_operation',
    agentId: 'agent-123'
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed');
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof ViennaError) {
    console.error('API error:', error.message);
  }
}
```

## API Reference

### Client Methods

- `login(email, password)` - Authenticate and get token
- `execute(options)` - Execute action with governance
- `getExecutions(filters?)` - List execution history
- `getExecution(id)` - Get execution details
- `getApprovals(filters?)` - List approval requests
- `approve(id, reviewer, notes?)` - Approve action
- `reject(id, reviewer, reason)` - Reject action
- `getWarrants(limit?)` - List warrants
- `verifyWarrant(id, signature)` - Verify warrant
- `getPolicies(filters?)` - List policies
- `createPolicy(policy)` - Create policy
- `updatePolicy(id, updates)` - Update policy
- `deletePolicy(id)` - Delete policy
- `getAgents(filters?)` - List agents
- `registerAgent(agent)` - Register agent
- `updateAgent(id, updates)` - Update agent
- `deleteAgent(id)` - Delete agent
- `health()` - Check API health
- `createEventStream(onEvent, onError?)` - Subscribe to real-time events

## Types

All types are exported from the main package:

```typescript
import type {
  ExecutionResult,
  Approval,
  Warrant,
  Policy,
  Agent,
  ExecutionOptions,
  ApprovalFilter,
  PolicyFilter
} from '@vienna-os/sdk';
```

## Support

- **Documentation:** https://docs.regulator.ai
- **GitHub:** https://github.com/risk-ai/regulator.ai
- **Email:** support@regulator.ai

## License

MIT License - see LICENSE file for details
