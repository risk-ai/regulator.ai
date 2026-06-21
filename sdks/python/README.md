# Vienna OS Python SDK

[![PyPI](https://img.shields.io/pypi/v/vienna-os)](https://pypi.org/project/vienna-os/)
[![Python](https://img.shields.io/pypi/pyversions/vienna-os)](https://pypi.org/project/vienna-os/)

Official Python SDK for the [Vienna OS](https://regulator.ai) AI governance platform.

Vienna OS lets you add a governance layer to any AI agent: policy-based approval workflows, warrant issuance, RBAC, audit trails, and webhook notifications — all from a single API.

---

## Installation

```bash
pip install vienna-os
```

Requires Python 3.9+ and `httpx`.

---

## Quick Start

```python
from vienna_os import ViennaOS

# Initialize with your tenant API key (from Settings → API Keys)
client = ViennaOS(api_key="sk-...")

# Submit a proposal for governance evaluation
proposal = client.submit_proposal(
    agent_id="agent-your-id",
    action="send_email",
    payload={
        "to": "user@example.com",
        "subject": "Your report is ready",
        "body": "...",
    },
)

print(proposal["state"])  # "approved", "pending", "denied"

if proposal["state"] == "approved":
    warrant = proposal.get("warrant")
    print("Warrant ID:", warrant["id"])
    print("Expires at:", warrant["expires_at"])
    # Execute the action with the warrant as proof of approval
```

---

## Usage

### Submit a Proposal

```python
proposal = client.submit_proposal(
    agent_id="agent-xyz",
    action="delete_records",
    payload={"table": "users", "filter": {"inactive_days": 365}},
    risk_tier=2,          # Override risk tier (0=auto, 1=low, 2=medium, 3=high)
    simulation=False,     # True = dry-run, no side effects
)
```

**States:**
- `"approved"` — auto-approved by policy; `warrant` key present
- `"pending"` — waiting for human review (Tier 2+)
- `"denied"` — blocked by policy

### Retrieve a Warrant

```python
# Poll for warrant if proposal is pending
import time

for _ in range(30):
    warrant = client.get_warrant(proposal["id"])
    if warrant.get("id"):
        break
    time.sleep(10)  # poll every 10 seconds

print("Warrant signature:", warrant["signature"])
```

### List Policies

```python
policies = client.list_policies(enabled=True)

for policy in policies:
    print(f"[{policy['id']}] {policy['name']} — {policy['description']}")
```

### Create a Policy

```python
policy = client.create_policy(
    name="Block PII Export",
    description="Prevent bulk export of PII records",
    conditions={
        "pii_export": {
            "type": "action_matches",
            "pattern": "export*",
        }
    },
    actions={
        "pii_export": "deny",
    },
    priority=10,
    enabled=True,
    tags=["privacy", "gdpr"],
)

print("Created policy:", policy["id"])
```

---

## Async Client

For async frameworks (FastAPI, asyncio):

```python
import asyncio
from vienna_os.async_client import AsyncViennaOS

async def main():
    async with AsyncViennaOS(api_key="sk-...") as client:
        proposal = await client.submit_proposal(
            agent_id="agent-xyz",
            action="send_sms",
            payload={"to": "+1555...", "message": "Alert!"},
        )
        print(proposal["state"])

asyncio.run(main())
```

---

## LangChain Integration

```python
from langchain.tools import tool
from vienna_os import ViennaOS

client = ViennaOS(api_key="sk-...")

@tool
def governed_action(action: str, payload: dict) -> str:
    """Execute an action with Vienna OS governance approval."""
    proposal = client.submit_proposal(
        agent_id="langchain-agent-001",
        action=action,
        payload=payload,
    )
    if proposal["state"] == "denied":
        return f"Action denied by policy: {proposal.get('error', 'policy violation')}"
    if proposal["state"] == "pending":
        return f"Action pending human approval (proposal: {proposal['id']})"
    return f"Action approved. Warrant: {proposal['warrant']['id']}"
```

---

## Error Handling

```python
from vienna_os.client import ViennaOSError

try:
    proposal = client.submit_proposal(agent_id="...", action="risky_action")
except ViennaOSError as e:
    print(f"Error {e.status_code}: {e}")
    if e.response:
        print("Details:", e.response)
```

---

## Configuration

| Parameter  | Default                              | Description              |
|------------|--------------------------------------|--------------------------|
| `api_key`  | required                             | Tenant API key           |
| `base_url` | `https://console.regulator.ai`       | Console proxy URL        |
| `timeout`  | `30.0`                               | HTTP timeout (seconds)   |

---

## Publishing (for maintainers)

```bash
# Build
cd sdks/python
pip install build twine
python -m build

# Test on TestPyPI
twine upload --repository testpypi dist/*

# Publish (Max/Whit credentials required)
twine upload dist/*
```

---

## License

MIT — see [LICENSE](../../LICENSE)
