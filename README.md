<p align="center">
  <strong>🛡️ Vienna OS</strong>
  <br>
  <em>The governance control plane for autonomous AI agents</em>
</p>

<p align="center">
  <a href="https://regulator.ai">Website</a> ·
  <a href="https://regulator.ai/docs">Documentation</a> ·
  <a href="https://regulator.ai/try">Try Live</a> ·
  <a href="https://console.regulator.ai">Console</a> ·
  <a href="https://regulator.ai/blog">Blog</a>
</p>

---

**Vienna OS** sits between AI agent intent and real-world execution. Every agent action flows through policy evaluation, risk tiering, cryptographic warrant issuance, operator approval, execution, verification, and immutable audit logging.

**No warrant, no execution.**

```
Agent → Intent Gateway → Policy Engine → Risk Tier → Approval → Warrant → Execute → Verify → Audit
```

## Why

AI agents are being deployed in production — executing transactions, deploying code, sending communications, modifying data. But there's no standard layer for:

- **Approval workflows** — Who authorized this agent action?
- **Policy enforcement** — Does this action comply with business rules?
- **Audit trails** — Can you prove what happened, when, and why?
- **Risk tiering** — Is a file read treated the same as a wire transfer?
- **Cryptographic proof** — Is there tamper-evident evidence of authorization?

Vienna OS fills this gap.

## Quick Start

### 1. Try the API (no signup)

```bash
curl -X POST https://vienna-os.fly.dev/api/v1/agent/intent \
  -H "Content-Type: application/json" \
  -d '{"action":"check_health","source":"openclaw","tenant_id":"test"}'
```

### 2. Access the Console

Visit [console.regulator.ai](https://console.regulator.ai) — login with `vienna` / `vienna2024`

### 3. Self-Host

```bash
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
cp .env.example .env  # Configure your environment
npm install

# Start the console (backend + frontend)
npm run dev:server    # API server on :3001
npm run dev:console   # React SPA on :5174

# Start the marketing site
npm run dev:marketing # Next.js on :3000
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Vienna OS                                              │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Intent   │→│  Policy   │→│  Risk    │→│ Approval │ │
│  │  Gateway  │  │  Engine   │  │  Tier    │  │ Queue   │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│       ↑                                         │       │
│       │              ┌──────────┐               ↓       │
│       │              │  Audit   │←──── ┌──────────┐    │
│       │              │  Trail   │      │  Warrant  │    │
│       │              └──────────┘      │ Authority │    │
│       │                    ↑           └──────────┘    │
│       │              ┌──────────┐           │          │
│       │              │  Verify  │←──── ┌──────────┐    │
│       │              │  Engine  │      │ Execution │    │
│  Agent               └──────────┘      │  Router   │    │
│                                        └──────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Core Services

| Service | Purpose |
|---------|---------|
| **Intent Gateway** | Single entry point for all agent requests |
| **Policy Engine** | Policy-as-code rule evaluation |
| **Warrant Authority** | Cryptographically signed execution authorization |
| **Execution Router** | Routes warranted actions to adapters |
| **Verification Engine** | Post-execution scope compliance check |
| **Audit Trail** | Append-only immutable event ledger |

### Risk Tiers

| Tier | Approval | Examples |
|------|----------|----------|
| **T0** | Auto-approve | Status checks, log reads, internal queries |
| **T1** | Single operator | Config changes, service restarts, data writes |
| **T2** | Multi-party | Deployments, payments, data deletion |

## Project Structure

```
regulator.ai/
├── apps/
│   ├── marketing/            # Next.js marketing site (regulator.ai)
│   └── console/
│       ├── client/           # React SPA — operator console UI
│       └── server/           # Express API server
├── services/
│   └── vienna-lib/           # Core governance engine (300+ files)
│       ├── core/             # Intent gateway, policy engine, warrants
│       ├── execution/        # Action execution, verification, retry
│       ├── governance/       # Risk tiers, warrant authority, quotas
│       ├── adapters/         # OpenClaw, Slack, Email, GitHub
│       ├── distributed/      # Multi-node coordination
│       └── learning/         # Feedback loop, pattern detection
├── packages/
│   └── sdk/                  # TypeScript SDK for agent integration
├── LICENSE                   # Apache 2.0
├── CONTRIBUTING.md           # Contribution guide
└── .env.example              # Environment configuration template
```

## Integrations

| Adapter | Status | Description |
|---------|--------|-------------|
| **OpenClaw** | ✅ Live | Native agent intent bridge |
| **Slack** | ✅ Live | Interactive approval buttons, notifications |
| **Email** | ✅ Live | Approval requests, daily digest (Resend) |
| **GitHub** | ✅ Live | Governed deployments, PR status checks |
| **LangChain** | Compatible | HTTP tool wrapper |
| **CrewAI** | Compatible | Action governance wrapper |
| **AutoGen** | Compatible | REST API integration |

## SDK

```typescript
import { ViennaClient } from '@vienna-os/sdk';

const vienna = new ViennaClient({
  baseUrl: 'https://console.regulator.ai',
  apiKey: 'vos_your_api_key'
});

const result = await vienna.intent.submit({
  action: 'restart_service',
  parameters: { service: 'api-gateway', strategy: 'rolling' }
});
```

## Console

The operator console at [console.regulator.ai](https://console.regulator.ai) provides:

- **Now** — Real-time system posture
- **Fleet** — Agent governance dashboard
- **Approvals** — T1/T2 approval queue
- **Policies** — Visual policy builder
- **Intent** — Submit governed actions (11 types)
- **History** — Execution ledger & audit trail
- **Compliance** — Governance reports
- **Services** — Infrastructure health (5 governance engines)

## Pricing

| Plan | Price | Agents |
|------|-------|--------|
| Community | Free | 5 |
| Team | $49/agent/mo | 25 |
| Business | $99/agent/mo | 100 |
| Enterprise | Custom | Unlimited |

[Get started at regulator.ai/signup](https://regulator.ai/signup)

## Tech Stack

- **Runtime:** Node.js 22, Express
- **Frontend:** React (Vite), Next.js 15
- **Database:** SQLite (State Graph)
- **Hosting:** Fly.io (console), Vercel (marketing)
- **Auth:** scrypt hashing, session cookies, API keys
- **Email:** Resend
- **Payments:** Stripe
- **Analytics:** GA4

## License

Apache License 2.0 — see [LICENSE](./LICENSE)

## Team

Built by **Max Anderson** (Cornell Law) at **[ai.ventures](https://ai.ventures)**

---

<p align="center">
  <em>The governance layer agents answer to.</em>
  <br>
  <a href="https://regulator.ai">regulator.ai</a>
</p>
