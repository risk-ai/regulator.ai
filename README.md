# Vienna OS

**Governed execution control plane for AI agents**

Vienna OS provides execution-level governance for autonomous AI systems. It ensures that every AI action is validated, authorized, auditable, and reversible before execution.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Phase](https://img.shields.io/badge/Phase-28-green.svg)](docs/PHASES.md)
[![Tests](https://img.shields.io/badge/Tests-111%2F111-brightgreen.svg)](services/vienna-lib/test/)

**Production Status:** Phase 28 operational, Phase 29 in development

---

## The Problem

AI agents operate with increasing autonomy — managing infrastructure, executing trades, approving transactions. But most agentic systems lack:

- **Pre-execution validation** — Actions are blocked before damage, not detected after
- **Risk-based authorization** — Different risk levels require different approval workflows
- **Verifiable audit trails** — Every action is traced, attributable, and verifiable
- **Policy enforcement** — No-code governance rules that adapt in real-time

**Vienna OS solves this.**

---

## Core Architecture

Vienna OS implements a **governed execution pipeline** with six components:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Intent Gateway  │────▶│ Policy Engine│────▶│   Warrants  │
│  (validation)   │     │  (evaluation)│     │(authorization)
└─────────────────┘     └──────────────┘     └─────────────┘
                                                     │
                                                     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ Audit & Verify  │◀────│   Executor   │◀────│ State Graph │
│  (attestation)  │     │ (execution)  │     │(truth store)│
└─────────────────┘     └──────────────┘     └─────────────┘
```

### 1. Intent Gateway
- **What:** Canonical ingress for all agent actions
- **Why:** Single validation point prevents bypass
- **How:** Schema validation, source verification, risk classification

### 2. Policy Engine
- **What:** Visual policy builder with runtime evaluation
- **Why:** Operators define rules without code changes
- **How:** Condition matching (11 operators) + actions (block, approve, notify)

### 3. Warrants
- **What:** Transactional execution authorization
- **Why:** Binds truth + plan + approval before execution
- **How:** Signed tokens with preconditions, rollback plans, expiration

### 4. Executor
- **What:** Deterministic execution with adapter isolation
- **Why:** All side effects mediated through single pipeline
- **How:** Execution ledger, adapter pattern, trading guards

### 5. State Graph
- **What:** Source-of-truth for system state
- **Why:** Governance decisions require accurate state
- **How:** SQLite database, versioned snapshots, state reconciliation

### 6. Audit & Verification
- **What:** Cryptographic attestation + compliance reports
- **Why:** Prove that governance was enforced
- **How:** Execution attestations, verification receipts, compliance exports

---

## Key Features

### 🛡️ **Three-Tier Risk Model**

| Tier | Description | Governance |
|------|-------------|-----------|
| **T0** | Reversible, low-stakes | Auto-approve, lightweight logging |
| **T1** | Moderate impact | Operator approval, structured plan |
| **T2** | Irreversible, high-stakes | Multi-party approval, Metternich review |

### 🔐 **Warrant System**
Execution warrants bind:
- Current truth (state preconditions)
- Execution plan (what will run)
- Operator approval (who authorized)
- Rollback procedure (how to undo)

**T1/T2 actions cannot execute without a valid warrant.**

### 📋 **Visual Policy Builder**
No-code governance rules:

```javascript
IF   action = wire_transfer
AND  payload.amount > 10000
THEN require_approval tier=T2
     AND notify channels=[slack, email]
```

**11 operators:** ==, !=, >, <, >=, <=, contains, starts_with, ends_with, in, not_in

### 🤖 **Agent Fleet Dashboard**
Real-time monitoring:
- Auto-register agents from execution ledger
- Success/failure rates per agent
- Suspend misbehaving agents
- 24-hour activity timeline

### 📬 **Multi-Channel Notifications**
Policy-triggered alerts via:
- **Slack:** Interactive approval buttons
- **Email:** Dark-theme HTML with CTA links
- **GitHub:** PR status checks + warrant metadata

---

## Quick Start

### Prerequisites
- Node.js 18+
- SQLite 3
- (Optional) Slack webhook, Resend API key

### Installation

```bash
# Clone repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Install dependencies
npm install

# Initialize State Graph
cd services/vienna-lib
npm run db:init

# Start console server
cd ../../apps/console/server
npm run dev

# Start console client (separate terminal)
cd ../client
npm run dev
```

Console available at: **http://localhost:5173**

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_PATH=./vienna-state.db

# Authentication (demo mode)
DEMO_USERNAME=vienna
DEMO_PASSWORD=vienna2024

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
RESEND_API_KEY=re_...
VIENNA_NOTIFICATION_EMAIL=ops@your-company.com

# Risk config
DEFAULT_RISK_TIER=T0
ENABLE_AUTO_APPROVAL_T0=true
```

### First Intent

Submit an intent via API:

```bash
curl -X POST http://localhost:3120/api/v1/agent/intent \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check_system_health",
    "payload": {},
    "source": {
      "id": "operator-max",
      "platform": "api"
    }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-abc123",
    "accepted": true,
    "action": "check_system_health",
    "metadata": {
      "risk_tier": "T0",
      "policies_matched": 0
    }
  }
}
```

---

## Architecture Deep Dive

### Execution Pipeline

```
Agent Request
    │
    ▼
Intent Gateway
    ├─▶ Validate schema
    ├─▶ Verify source
    ├─▶ Classify risk tier
    │
    ▼
Policy Engine
    ├─▶ Evaluate conditions
    ├─▶ Apply actions (block/approve/notify)
    │
    ▼
Warrant Check (T1/T2 only)
    ├─▶ Verify preconditions
    ├─▶ Check approval status
    ├─▶ Validate rollback plan
    │
    ▼
Executor
    ├─▶ Acquire execution lease
    ├─▶ Run action via adapter
    ├─▶ Record execution ledger
    │
    ▼
Verification
    ├─▶ Generate attestation
    ├─▶ Update State Graph
    └─▶ Emit audit events
```

### State Graph Design

**Single source of truth** for:
- Objectives (what the system should do)
- Execution ledger (what actions ran)
- Policies (governance rules)
- Agents (who is operating)
- Warrants (active authorizations)

**Key properties:**
- Append-only execution ledger
- Versioned state snapshots
- Foreign key constraints (data integrity)
- Multi-tenant isolation

### Adapter Pattern

**Execution adapters** provide isolated interfaces to external systems:

```javascript
// adapters/slack.js
class SlackAdapter {
  async sendApprovalRequest(approval) {
    // Interactive buttons for approve/deny
  }

  async sendPolicyNotification(notification) {
    // Policy match alerts
  }
}

// adapters/email.js
class EmailAdapter {
  async sendApprovalRequest(approval, recipientEmail) {
    // HTML email with CTA
  }

  async sendDailyDigest(tenant_id) {
    // Governance summary
  }
}
```

**Why adapters?**
- Executor has NO direct execution authority
- Adapters are the only components with `require('fs')` / `require('child_process')`
- All side effects flow through adapters (enforceable boundary)

---

## API Reference

### Intent Submission

**POST** `/api/v1/agent/intent`

Submit an agent action for governance.

**Request:**
```json
{
  "action": "wire_transfer",
  "payload": {
    "amount": 15000,
    "recipient": "acct-xyz"
  },
  "source": {
    "id": "agent-trading-bot",
    "platform": "langchain"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "intent_id": "intent-abc123",
    "accepted": true,
    "action": "wire_transfer",
    "metadata": {
      "risk_tier": "T2",
      "warrant_required": true,
      "policies_matched": 1
    }
  }
}
```

### Policy Management

**POST** `/api/v1/policies`

Create governance policy.

**Request:**
```json
{
  "name": "Block after-hours trading",
  "conditions": [
    { "field": "action", "operator": "==", "value": "execute_trade" },
    { "field": "payload.hour", "operator": "<", "value": 9 }
  ],
  "actions": [
    { "type": "block" }
  ],
  "priority": 100
}
```

**GET** `/api/v1/policies` — List policies  
**GET** `/api/v1/policies/:id` — Get policy  
**PATCH** `/api/v1/policies/:id` — Update policy  
**DELETE** `/api/v1/policies/:id` — Delete policy  
**POST** `/api/v1/policies/:id/test` — Test against sample intent

### Fleet Dashboard

**GET** `/api/v1/fleet` — Fleet overview + statistics  
**GET** `/api/v1/fleet/agents` — List all agents  
**GET** `/api/v1/fleet/agents/:id` — Agent details  
**GET** `/api/v1/fleet/agents/:id/activity` — Activity timeline  
**PATCH** `/api/v1/fleet/agents/:id` — Update status (active/inactive/suspended)

### Custom Actions

**POST** `/api/v1/actions` — Register custom action  
**GET** `/api/v1/actions` — List actions  
**GET** `/api/v1/actions/:id` — Get action  
**PATCH** `/api/v1/actions/:id` — Update action  
**DELETE** `/api/v1/actions/:id` — Delete action

---

## Deployment

### Development

```bash
npm run dev:all
```

Starts:
- Console server (port 3120)
- Console client (port 5173)
- Vienna lib tests (watch mode)

### Production (Fly.io)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy
flyctl launch
flyctl deploy
```

**Unified monolith:** Frontend + backend in single container (164 MB image).

### Environment Variables

Required:
```bash
DATABASE_PATH=/data/vienna-state.db
```

Optional:
```bash
SLACK_WEBHOOK_URL=...
RESEND_API_KEY=...
VIENNA_NOTIFICATION_EMAIL=...
```

---

## Testing

```bash
# Run full test suite
cd services/vienna-lib
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**Current status:** 111/111 tests passing

**Test categories:**
- Phase 1: Core pipeline (validation, normalization, resolution)
- Phase 11: Intent tracing
- Phase 15: Policy engine
- Phase 22: Quota enforcement
- Phase 23: Attestation
- Phase 28: System integration

---

## Roadmap

### Q2 2026 (Current)
- [x] Core pipeline MVP
- [x] Dashboard v1 (13 pages)
- [x] Policy builder
- [x] Fleet dashboard
- [x] Custom actions
- [x] Slack/Email adapters
- [x] Open-source release
- [ ] OpenClaw deep integration
- [ ] Multi-tenant auth
- [ ] SDK npm publish

### Q3 2026
- [ ] Compliance reports (SOC 2, GDPR)
- [ ] Policy versioning + rollback
- [ ] Agent sandboxing (VM2)
- [ ] Cost tracking per agent
- [ ] SLA enforcement

### Q4 2026
- [ ] Federated ledger (cross-node sync)
- [ ] Warrant marketplace
- [ ] Policy templates library
- [ ] Agent certification program

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas we'd love help with:**
- Additional adapters (GitHub, Linear, Jira, PagerDuty)
- Policy templates (finance, healthcare, legal)
- Language SDKs (Python, Go, Rust)
- Documentation improvements
- Integration examples

**Before submitting:**
1. Run tests: `npm test`
2. Run linter: `npm run lint`
3. Update docs if adding features
4. Add test coverage for new code

---

## Architecture Decisions

### Why SQLite?
- **Simplicity:** No external database to manage
- **Portability:** Single file, easy backups
- **Performance:** 100K+ writes/sec for execution ledger
- **ACID:** Built-in transactions for consistency

**Trade-off:** Not horizontally scalable. For multi-node deployments, use federated ledger (Phase 30+).

### Why Monolithic Deployment?
- **Faster iteration:** No microservice overhead during MVP
- **Lower ops cost:** Single container, single process
- **Easier debugging:** Full stack trace in one place

**Future:** Extract high-traffic components (Intent Gateway, Policy Engine) when needed.

### Why Node.js?
- **Ecosystem:** Rich adapter libraries (Slack, Resend, GitHub)
- **Async I/O:** Good for I/O-bound governance work
- **TypeScript support:** Type safety for API contracts

**Trade-off:** Not ideal for CPU-bound work. Executor runs in separate process when needed.

---

## License

Apache License 2.0 — See [LICENSE](LICENSE) for details.

**Commercial use permitted.** We encourage companies to:
- Deploy Vienna OS internally
- Build proprietary extensions
- Offer managed services

**Trademarks:** "Vienna OS" and the shield logo are trademarks of Law.AI Corp.

---

## Support

- **Documentation:** https://regulator.ai/docs
- **GitHub Issues:** https://github.com/risk-ai/regulator.ai/issues
- **Community Discord:** (coming soon)
- **Commercial support:** hello@regulator.ai

---

## Credits

**Vienna OS** is built by the team at [Law.AI](https://law.ai).

**Contributors:**
- Max Anderson ([@maxanderson](https://github.com/maxanderson95)) — Architecture, backend
- Aiden ([@aiden](https://github.com/aidenfrog)) — Frontend, adapters, marketing

**Inspiration:**
- [Anthropic Constitutional AI](https://www.anthropic.com/constitutional-ai)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Temporal Workflow Engine](https://temporal.io)

---

**Govern your agents. Ship with confidence.**

🛡️ [regulator.ai](https://regulator.ai) | 📧 hello@regulator.ai | 🐙 [GitHub](https://github.com/risk-ai/regulator.ai)
