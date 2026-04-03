# Vienna OS TypeScript SDK

Strongly-typed TypeScript SDK for the Vienna OS AI Agent Governance Platform.

## Installation

```bash
# Install from npm registry (when published)
npm install @vienna-os/sdk

# Or install from source (for development)
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/sdk/typescript  
npm install
npm run build
npm link
```

## Quick Start

```typescript
import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  baseUrl: 'http://localhost:3100',  // or your Vienna OS instance
  apiKey: 'your_api_key_here',       // optional for local dev
  timeout: 30000,                    // optional, defaults to 30s
});

// Submit an intent
const result = await vienna.submitIntent({
  agent_id: 'my-deployment-agent',
  action: 'deploy_service',
  payload: { 
    service: 'api-gateway', 
    version: 'v2.0.0',
    environment: 'production'
  },
  risk_tier: 'T2',  // optional, can be auto-detected
});

// Handle different outcomes
switch (result.pipeline) {
  case 'executed':
    console.log('✅ Deployed successfully');
    console.log('Warrant ID:', result.warrant?.id);
    break;
    
  case 'pending_approval':
    console.log('⏳ Awaiting human approval');
    console.log('Proposal ID:', result.proposal?.id);
    console.log('Approve at: http://localhost:5173/approvals');
    break;
    
  case 'blocked':
    console.log('❌ Action blocked:', result.reason);
    break;
    
  case 'simulated':
    console.log('🧪 Simulation result:', result.would_approve);
    break;
}
```

## API Reference

### Client Initialization

```typescript
const vienna = new ViennaClient({
  baseUrl: string;     // Vienna OS API URL
  apiKey?: string;     // API key for authentication
  timeout?: number;    // Request timeout in ms (default: 30000)
});
```

### Intent Operations

#### Submit Intent

```typescript
await vienna.submitIntent({
  agent_id: string;
  action: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  risk_tier?: 'T0' | 'T1' | 'T2' | 'T3';
  simulation?: boolean;
});
```

#### Simulate Intent

```typescript
const result = await vienna.simulate({
  agent_id: 'my-agent',
  action: 'deploy',
  payload: { ... },
});
```

#### Batch Submit

```typescript
const results = await vienna.submitBatch([
  { agent_id: 'agent-1', action: 'deploy', payload: {...} },
  { agent_id: 'agent-2', action: 'scale', payload: {...} },
]);

console.log(`Succeeded: ${results.succeeded}, Failed: ${results.failed}`);
```

### Agent Management

#### List Agents

```typescript
const response = await vienna.listAgents({
  page: 1,
  limit: 50,
  status: 'active',
  tier: 'T2',
});

response.data.forEach(agent => {
  console.log(agent.name, agent.status);
});

console.log(`Page ${response.pagination.page} of ${response.pagination.totalPages}`);
```

#### Register Agent

```typescript
const agent = await vienna.registerAgent({
  name: 'My Agent',
  type: 'deployment-agent',
  description: 'Handles production deployments',
  default_tier: 'T2',
  capabilities: ['deploy', 'rollback'],
  config: { region: 'us-east-1' },
});
```

#### Update Agent

```typescript
await vienna.updateAgent('agent-id', {
  status: 'suspended',
  config: { region: 'us-west-2' },
});
```

#### Delete Agent

```typescript
await vienna.deleteAgent('agent-id');
```

### Policy Management

#### List Policies

```typescript
const response = await vienna.listPolicies({
  page: 1,
  limit: 10,
  enabled: true,
  tier: 'T2',
});
```

#### Create Policy

```typescript
const policy = await vienna.createPolicy({
  name: 'Production Deployment Policy',
  tier: 'T2',
  rules: {
    require_approval: true,
    allowed_hours: { start: 9, end: 17 },
  },
  enabled: true,
  priority: 100,
});
```

#### Update Policy

```typescript
await vienna.updatePolicy('policy-id', {
  enabled: false,
  priority: 50,
});
```

#### Delete Policy

```typescript
await vienna.deletePolicy('policy-id');
```

### Approval Operations

#### Approve Proposal

```typescript
const result = await vienna.approveProposal('proposal-id', {
  reviewer: 'operator-alice',
  reason: 'Approved after review',
});

console.log('Warrant issued:', result.warrant.id);
```

#### Reject Proposal

```typescript
await vienna.rejectProposal('proposal-id', {
  reviewer: 'operator-bob',
  reason: 'Deployment window closed',
});
```

### Warrant Verification

```typescript
const verification = await vienna.verifyWarrant('warrant-id', 'signature');

if (verification.valid) {
  console.log('Warrant is valid');
  console.log('Expires:', verification.warrant?.expires_at);
}
```

### System Health

```typescript
const health = await vienna.health();
console.log('Status:', health.status);
console.log('Version:', health.version);
```

## Type Definitions

### Intent

```typescript
interface Intent {
  agent_id: string;
  action: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  risk_tier?: 'T0' | 'T1' | 'T2' | 'T3';
  simulation?: boolean;
}
```

### IntentResult

```typescript
interface IntentResult {
  pipeline: 'executed' | 'pending_approval' | 'blocked' | 'simulated';
  intent_id?: string;
  warrant?: Warrant;
  proposal?: Proposal;
  risk_tier?: string;
  reason?: string;
  would_approve?: boolean;
}
```

### Agent

```typescript
interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  default_tier: string;
  capabilities: string[];
  config: Record<string, any>;
  status: 'active' | 'suspended' | 'terminated';
  created_at: string;
  updated_at?: string;
}
```

### Policy

```typescript
interface Policy {
  id: string;
  name: string;
  description?: string;
  tier: string;
  rules: Record<string, any>;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at?: string;
}
```

## Error Handling

```typescript
try {
  await vienna.submitIntent({ ... });
} catch (error) {
  if (error.message === 'Request timed out') {
    // Handle timeout
  } else if (error.message.includes('HTTP 401')) {
    // Handle authentication error
  } else {
    // Handle other errors
  }
}
```

## License

MIT
