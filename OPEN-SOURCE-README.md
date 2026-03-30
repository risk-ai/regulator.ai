<p align="center">
  <img src="https://regulator.ai/logo-icon.png" width="80" alt="Vienna OS" />
</p>

<h1 align="center">Vienna OS</h1>
<p align="center"><strong>The execution kernel for AI agents.</strong></p>
<p align="center">Agents propose. Vienna OS decides. Every action warranted. Every execution verified.</p>

<p align="center">
  <a href="https://regulator.ai">Website</a> ·
  <a href="https://console.regulator.ai">Console</a> ·
  <a href="https://regulator.ai/docs">Docs</a> ·
  <a href="https://regulator.ai/try">Try Live</a>
</p>

---

## The Problem

AI agents are taking real-world actions. A smarter model is not the answer to:

- Network timeouts that duplicate a $50K transaction
- Stale context from inference latency causing wrong decisions
- Prompt injections that bypass "please be careful" guardrails
- Zero audit trail for regulators asking "why did the AI do that?"

These are **infrastructure problems**, not intelligence problems.

## The Solution

Vienna OS is the **deterministic runtime boundary** between agent reasoning and real-world side effects. Like an OS kernel validates every syscall before allowing state modification, Vienna OS validates every agent intent before allowing execution.

```
Agent → Intent → Policy Eval → Risk Tier → Warrant → Execute → Verify → Audit
```

**Prompts are not permissions.** Agent output is untrusted input. Every action is a proposal — a claim the agent wants to act, not an order that it will.

## Quick Start

### Node.js

```bash
npm install vienna-os
```

```typescript
import { ViennaClient } from 'vienna-os';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  agentId: 'your-agent-id',
});

const result = await vienna.submitIntent({
  action: 'deploy',
  payload: { service: 'api-gateway', version: 'v2.4.1' },
});

// result.pipeline: "executed" | "pending_approval" | "denied" | "simulated"
// result.warrant: { id, signature, expires_at } — cryptographic execution authority
```

### Python

```bash
pip install vienna-os
```

```python
from vienna_os import ViennaClient, Intent

vienna = ViennaClient(
    base_url="https://console.regulator.ai",
    agent_id="your-agent-id",
)

result = vienna.submit_intent(Intent(
    action="deploy",
    payload={"service": "api-gateway", "version": "v2.4.1"},
))
```

### REST API

```bash
curl -X POST https://console.regulator.ai/api/v1/agent/intent \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your-agent-id",
    "action": "deploy",
    "payload": {"service": "api-gateway"}
  }'
```

## Architecture

Vienna OS implements the **Decision Intelligence Runtime** pattern:

| Pillar | What it does |
|--------|-------------|
| **Policy as a Claim** | Agent output is untrusted input. Every action is a proposal, not an order. |
| **Contracts as Code** | Deterministic policy evaluation — not another LLM asking "is this dangerous?" |
| **Cryptographic Warrants** | SHA-256 signed, time-limited, scope-constrained execution authority. |
| **JIT Verification** | Context drift detection before execution. Stale decisions are aborted. |
| **Idempotency** | Unique execution keys prevent duplicate transactions on retry. |
| **Decision Flow Tracing** | One correlation ID reconstructs the entire decision chain. |

## Risk Tiers

| Tier | Approval | Examples |
|------|----------|----------|
| **T0** | Auto-approve | Read-only queries, health checks, status |
| **T1** | Single operator | Config changes, service restarts, data writes |
| **T2** | Multi-party | Deployments, payments, data deletion |
| **T3** | Justification + rollback | Production DB migrations, financial transactions |

## Console

Live at [console.regulator.ai](https://console.regulator.ai):

- **Now** — Live system posture dashboard
- **Intent** — Submit actions through the pipeline
- **Approvals** — Approve/deny pending proposals
- **Fleet** — Agent registry with trust scores
- **Policies** — Policy-as-code rule management
- **History** — Immutable audit trail
- **Compliance** — One-click governance reports

## Framework Agnostic

Works with any system that makes HTTP requests:

- OpenClaw
- LangChain / LangGraph
- CrewAI
- AutoGen
- Custom agents

5 lines to integrate. One API.

## Pricing

| Plan | Price | Agents |
|------|-------|--------|
| Community | Free | 5 |
| Team | $49/agent/mo | 25 |
| Business | $99/agent/mo | 100 |
| Enterprise | Custom | Unlimited |

## License

Business Source License 1.1 — free for evaluation and non-production use. Converts to Apache 2.0 on 2030-01-01.

## Built By

[ai.ventures](https://ai.ventures) — Cornell Law × systems engineering.
Patent pending: USPTO #64/018,152.

---

<p align="center">
  <strong>Prompts are not permissions.</strong>
</p>
