# OpenClaw + Vienna OS Integration Guide

Vienna OS adds governance, policy enforcement, and audit trails to any AI agent. This guide shows you how to integrate Vienna OS into an agent running on OpenClaw — the agent management platform built for AI-native operators.

---

## Overview

When an OpenClaw agent wants to perform a sensitive action (sending an email, making a trade, deleting data), it submits a **proposal** to Vienna OS. Vienna OS evaluates the proposal against your tenant's policies and either:

- **Auto-approves** it (risk tier 0/1) and issues a cryptographic **warrant**
- **Routes it for human review** (risk tier 2+) via the Vienna OS console
- **Denies** it immediately (policy block)

The agent executes the action only after receiving a valid warrant.

```
OpenClaw Agent
    │
    ▼
Vienna OS (submit_proposal)
    │
    ├── T0/T1: auto-approve → warrant issued instantly
    ├── T2: human review queue → operator approves/denies in console
    └── Block: denied immediately, reason logged
    │
    ▼
Action executed with warrant proof
```

---

## Prerequisites

1. **Vienna OS account** — [Sign up at regulator.ai](https://regulator.ai)
2. **API key** — Settings → API Keys → Create
3. **OpenClaw** with a running agent workspace
4. Install the SDK: `pip install vienna-os` or `npm install @vienna-os/client`

---

## Python Integration

### Basic Setup

```python
# agent.py
import os
from vienna_os import ViennaOS

client = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])
```

### Governing Agent Actions

Wrap every sensitive action with a proposal:

```python
import time
from vienna_os import ViennaOS
from vienna_os.client import ViennaOSError

client = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])

def governed_send_email(agent_id: str, to: str, subject: str, body: str) -> dict:
    """Send an email with Vienna OS governance."""
    
    # 1. Submit proposal
    proposal = client.submit_proposal(
        agent_id=agent_id,
        action="send_email",
        payload={"to": to, "subject": subject, "body_preview": body[:200]},
    )
    
    if proposal["state"] == "denied":
        raise PermissionError(f"Action denied: {proposal.get('error', 'policy violation')}")
    
    if proposal["state"] in ("pending", "approved"):
        # 2. Wait for warrant (poll up to 5 minutes)
        warrant = None
        for _ in range(30):
            try:
                warrant = client.get_warrant(proposal["id"])
                if warrant.get("id"):
                    break
            except ViennaOSError:
                pass
            time.sleep(10)
        
        if not warrant or not warrant.get("id"):
            raise TimeoutError("Warrant not issued within timeout")
    
    # 3. Execute with warrant proof
    return send_email_with_warrant(
        to=to,
        subject=subject,
        body=body,
        warrant_id=warrant["id"],
        warrant_signature=warrant["signature"],
    )


def send_email_with_warrant(to, subject, body, warrant_id, warrant_signature):
    # Your actual email sending logic here
    # Pass warrant_id as X-Vienna-Warrant-ID header for auditability
    import requests
    return requests.post(
        "https://api.yourplatform.com/send-email",
        json={"to": to, "subject": subject, "body": body},
        headers={"X-Vienna-Warrant-ID": warrant_id},
    ).json()
```

### OpenClaw Tool Integration

For agents using OpenClaw's tool protocol:

```python
# tools/governed_action.py
from vienna_os import ViennaOS
from openclaw.tools import tool, ToolContext

vienna = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])

@tool(
    name="governed_file_write",
    description="Write data to a file — governed by Vienna OS policy",
    schema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path"},
            "content": {"type": "string", "description": "Content to write"},
        },
        "required": ["path", "content"],
    }
)
async def governed_file_write(ctx: ToolContext, path: str, content: str) -> str:
    agent_id = ctx.agent_id
    
    proposal = vienna.submit_proposal(
        agent_id=agent_id,
        action="file_write",
        payload={"path": path, "content_length": len(content)},
    )
    
    if proposal["state"] == "denied":
        return f"❌ Action denied by Vienna OS policy"
    
    if proposal["state"] == "pending":
        return f"⏳ Action queued for human review. Proposal: {proposal['id']}"
    
    # Auto-approved
    with open(path, "w") as f:
        f.write(content)
    
    return f"✅ File written with warrant {proposal['warrant']['id']}"
```

### Async Integration (for async OpenClaw agents)

```python
from vienna_os.async_client import AsyncViennaOS

vienna = AsyncViennaOS(api_key=os.environ["VIENNA_API_KEY"])

async def governed_action(agent_id: str, action: str, payload: dict) -> dict:
    async with AsyncViennaOS(api_key=os.environ["VIENNA_API_KEY"]) as client:
        proposal = await client.submit_proposal(
            agent_id=agent_id,
            action=action,
            payload=payload,
        )
        return proposal
```

---

## Node.js / TypeScript Integration

### Basic Setup

```typescript
import { ViennaOS } from '@vienna-os/client';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });
```

### Governing Agent Actions

```typescript
import { ViennaOS, ViennaOSError, Proposal } from '@vienna-os/client';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

async function governedAction(
  agentId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<Proposal> {
  const proposal = await vienna.submitProposal({ agentId, action, payload });

  if (proposal.state === 'denied') {
    throw new Error(`Action denied: ${proposal.error ?? 'policy violation'}`);
  }

  if (proposal.state === 'pending') {
    // Poll for warrant approval
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 10_000)); // 10s
      try {
        const warrant = await vienna.getWarrant(proposal.id);
        if (warrant.id) return { ...proposal, warrant };
      } catch { /* not ready yet */ }
    }
    throw new Error('Warrant not issued within 5 minutes');
  }

  return proposal;
}
```

### OpenClaw Action Hook (Node)

```typescript
// hooks/vienna-governance.ts
import { ViennaOS } from '@vienna-os/client';
import type { OpenClawActionHook } from '@openclaw/types';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

export const viennaGovernanceHook: OpenClawActionHook = async (ctx, next) => {
  const { agentId, action, payload } = ctx;

  const proposal = await vienna.submitProposal({ agentId, action, payload });

  if (proposal.state === 'denied') {
    ctx.deny(`Vienna OS: ${proposal.error ?? 'action blocked by policy'}`);
    return;
  }

  if (proposal.state === 'pending') {
    ctx.defer(`Vienna OS: action queued for review (${proposal.id})`);
    return;
  }

  // Approved — attach warrant to context for downstream audit
  ctx.set('vienna_warrant_id', proposal.warrant?.id);
  return next();
};
```

---

## Policy Configuration

Create policies in the Vienna OS console or via API:

```python
# Block all write operations to production DBs
policy = client.create_policy(
    name="Production DB Write Block",
    description="Prevent agents from writing to production databases without T2 approval",
    conditions={
        "prod_write": {
            "type": "all_of",
            "conditions": [
                {"type": "action_matches", "pattern": "db_write*"},
                {"type": "payload_field_matches", "field": "environment", "value": "production"},
            ]
        }
    },
    actions={
        "prod_write": {
            "action": "require_approval",
            "require_justification": True,
            "min_approvers": 1,
        }
    },
    priority=10,
    enabled=True,
    tags=["database", "production", "safety"],
)
```

---

## Common Pitfalls

### 1. Not awaiting the warrant before executing

**Wrong:**
```python
proposal = client.submit_proposal(agent_id="a", action="write_db", payload={...})
execute_action()  # ❌ Don't execute before checking warrant!
```

**Right:**
```python
proposal = client.submit_proposal(agent_id="a", action="write_db", payload={...})
if proposal["state"] != "approved":
    return  # Wait or handle denial
warrant = proposal.get("warrant")
if not warrant:
    raise ValueError("No warrant issued")
execute_action(warrant_id=warrant["id"])  # ✅
```

### 2. Storing the API key in source code

**Wrong:**
```python
client = ViennaOS(api_key="sk-abc123")  # ❌ Never hardcode!
```

**Right:**
```python
import os
client = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])  # ✅
```

### 3. Ignoring `pending` proposals

Some actions require human review. If your code ignores `pending` proposals, agents will silently skip actions that need approval. Always handle all three states.

### 4. Using `simulation=True` in production

Simulation mode (`submit_proposal(..., simulation=True)`) evaluates policy without executing. Use it for testing only — it will always return `state: "approved"` for audit purposes.

### 5. Not handling `ViennaOSError`

Network failures, expired API keys, and policy engine timeouts will raise `ViennaOSError`. Wrap calls in try/catch and handle gracefully.

---

## Webhook Notifications

Register a webhook to receive real-time approval/denial events:

```python
# Register webhook in console: Settings → Webhooks → Add
# Or via API (requires admin role):
import requests

requests.post(
    "https://console.regulator.ai/api/v1/webhooks",
    json={
        "url": "https://your-server.com/vienna-webhooks",
        "events": ["warrant.approve", "warrant.deny"],
        "secret": "your-hmac-secret",
    },
    headers={"Authorization": f"Bearer {VIENNA_API_KEY}"},
)
```

Validate incoming webhook signatures:

```python
import hmac, hashlib

def validate_webhook(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Resources

- [Vienna OS Console](https://console.regulator.ai)
- [API Reference](https://regulator.ai/docs/api)
- [Python SDK](../../../sdks/python/README.md)
- [Node SDK](../../../sdks/node/README.md)
- [Support](mailto:support@regulator.ai)
