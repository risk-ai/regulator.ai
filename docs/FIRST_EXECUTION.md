# Your First Execution with Vienna OS

**Time to complete:** ~10 minutes  
**Prerequisites:** A Vienna OS account at [console.regulator.ai](https://console.regulator.ai)

This guide walks you through submitting your first governed intent, from API key creation to checking the audit trail.

---

## Step 1: Create an API Key

After logging in, go to **Settings → API Keys** or use the API:

```bash
# Via curl (requires session cookie from login)
curl -X POST https://console.regulator.ai/api/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "my-first-key",
    "permissions": ["intents:submit", "executions:list"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "api_key": "vos_abc123def456...",
    "name": "my-first-key",
    "expires_at": "2027-04-02T00:00:00Z"
  }
}
```

> ⚠️ **Save your API key now** — it won't be shown again. The key is hashed before storage.

Set it as an environment variable:
```bash
export VIENNA_API_KEY="vos_abc123def456..."
export VIENNA_BASE_URL="https://console.regulator.ai"
```

---

## Step 2: Register an Agent

Every intent in Vienna must come from a registered agent:

```bash
curl -X POST $VIENNA_BASE_URL/api/v1/agents \
  -H "Authorization: Bearer $VIENNA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-deploy-bot",
    "name": "Deploy Bot",
    "type": "automated",
    "description": "Handles service deployments"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "my-deploy-bot",
    "status": "active",
    "trust_level": "standard"
  }
}
```

---

## Step 3: Create a Simple Policy

Policies control what agents can do. Let's create one that requires approval for deployments:

```bash
curl -X POST $VIENNA_BASE_URL/api/v1/policies \
  -H "Authorization: Bearer $VIENNA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Require approval for deploys",
    "description": "All deploy actions need operator approval",
    "enabled": true,
    "priority": 10,
    "conditions": {
      "action_types": ["deploy", "deploy_code"]
    },
    "decision": "escalate",
    "requirements": {
      "approval_required": true,
      "approval_count": 1
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "policy_id": "pol_abc123",
    "name": "Require approval for deploys",
    "enabled": true
  }
}
```

---

## Step 4: Submit Your First Intent

Now submit an intent through the governance pipeline:

### Using curl:
```bash
curl -X POST $VIENNA_BASE_URL/api/v1/execution/submit \
  -H "Authorization: Bearer $VIENNA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deploy",
    "agent_id": "my-deploy-bot",
    "tenant_id": "YOUR_TENANT_ID",
    "parameters": {
      "service": "api-gateway",
      "version": "v1.0.0",
      "environment": "staging"
    }
  }'
```

### Using the SDK:
```typescript
import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL!,
  agentId: 'my-deploy-bot',
  apiKey: process.env.VIENNA_API_KEY!,
});

const result = await vienna.submitIntent({
  action: 'deploy',
  payload: {
    service: 'api-gateway',
    version: 'v1.0.0',
    environment: 'staging',
  },
});

console.log(result);
```

**Response (with the policy we created):**
```json
{
  "success": true,
  "data": {
    "mode": "passback",
    "warrant_id": "wrt_20260402_143000_a1b2c3",
    "execution_id": "exe_1712345678_x9y8z7",
    "risk_tier": "T2",
    "instruction": {
      "action": "deploy",
      "parameters": { "service": "api-gateway", "version": "v1.0.0" },
      "constraints": { "max_duration_ms": 600000 }
    },
    "callback_url": "/api/v1/webhooks/execution-callback"
  }
}
```

The intent was evaluated by the policy engine, classified as T2 (requires approval), and a warrant was issued for passback execution.

---

## Step 5: Check the Audit Trail

Every governance decision is logged. Query the audit trail:

```bash
curl -X GET "$VIENNA_BASE_URL/api/v1/audit/recent?limit=5" \
  -H "Authorization: Bearer $VIENNA_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "event": "warrant_issued",
        "warrant_id": "wrt_20260402_143000_a1b2c3",
        "risk_tier": "T2",
        "timestamp": "2026-04-02T18:30:00.000Z"
      },
      {
        "event": "policy_evaluated",
        "policy_id": "pol_abc123",
        "decision": "escalate",
        "timestamp": "2026-04-02T18:29:59.500Z"
      },
      {
        "event": "intent_submitted",
        "action": "deploy",
        "agent_id": "my-deploy-bot",
        "timestamp": "2026-04-02T18:29:59.000Z"
      }
    ]
  }
}
```

---

## Step 6: Complete the Passback Execution

In passback mode, YOUR agent executes the action and reports back:

```bash
# After your agent performs the deployment, send the callback:
curl -X POST $VIENNA_BASE_URL/api/v1/webhooks/execution-callback \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exe_1712345678_x9y8z7",
    "status": "success",
    "result": {
      "action": "deploy",
      "target": "api-gateway",
      "version_deployed": "v1.0.0",
      "duration_ms": 45000
    }
  }'
```

**Response:**
```json
{
  "accepted": true,
  "execution_id": "exe_1712345678_x9y8z7",
  "previous_state": "awaiting_callback",
  "new_state": "complete"
}
```

Vienna verifies:
- ✅ The execution_id exists and is awaiting callback
- ✅ The reported action matches the warrant scope
- ✅ The warrant hasn't expired or been revoked
- ✅ Duration and target constraints are satisfied

---

## Step 7: Try Simulation Mode (Bonus)

Test intents without executing them:

```bash
curl -X POST $VIENNA_BASE_URL/api/v1/execution/submit \
  -H "Authorization: Bearer $VIENNA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "delete_production",
    "agent_id": "my-deploy-bot",
    "tenant_id": "YOUR_TENANT_ID",
    "parameters": { "table": "users" },
    "simulation": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "simulation",
    "risk_tier": "T3",
    "execution_mode": "passback",
    "would_require_approval": true,
    "policy_evaluation": [...]
  }
}
```

No warrant issued, no execution — just a preview of what would happen.

---

## What's Next?

- **[Adapter Guide](./ADAPTER_GUIDE.md)** — Connect Vienna to external APIs (Slack, GitHub, custom endpoints)
- **[API Reference](./API_REFERENCE.md)** — Full endpoint documentation
- **[SDK Examples](../sdk/node/examples/)** — Retry patterns, batch intents, policy simulation
- **[Architecture](./ARCHITECTURE.md)** — How the governance pipeline works end-to-end

---

*Questions? Open an issue on [GitHub](https://github.com/risk-ai/regulator.ai) or reach out at support@regulator.ai.*
