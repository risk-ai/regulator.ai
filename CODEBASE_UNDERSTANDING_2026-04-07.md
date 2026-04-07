# Vienna OS Codebase Understanding
**Date:** April 7, 2026  
**Purpose:** Ensure marketing pages reflect what we actually built

---

## What Vienna OS Actually Is

### Core Product
**Vienna OS is a governance control plane for AI agents.**

It's NOT:
- ❌ An agent runtime or execution environment
- ❌ An AI model or inference service
- ❌ A monitoring/observability platform
- ❌ A low-level execution layer

It IS:
- ✅ **Approval workflow system** for agent actions
- ✅ **Policy evaluation engine** (risk tier classification)
- ✅ **Cryptographic warrant issuance** (time-limited authorization tokens)
- ✅ **Audit trail generator** (immutable evidence chain)
- ✅ **Multi-party approval orchestration** (T1/T2/T3 workflows)

---

## Architecture (What We Built)

### System Components

**1. Gateway (Intent Submission)**
- **Location:** `apps/console-proxy/api/execute.js`
- **Purpose:** Receive agent execution intents
- **Input:** `{ action, agent_id, context, payload }`
- **Output:** Execution ID, status (executed/pending_approval/blocked)

**2. Policy Engine**
- **Location:** `apps/console-proxy/api/v1/policies.js`
- **Purpose:** Evaluate intents against governance rules
- **Features:**
  - 11 operators (==, !=, >, <, contains, matches, etc.)
  - JSON path evaluation ($.payload.amount)
  - Risk tier classification (T0/T1/T2/T3)
  - Action allow/block decisions

**3. Approval Workflow**
- **Location:** `apps/console-proxy/api/v1/approvals.js`
- **Purpose:** Human review for T1-T3 actions
- **Features:**
  - Multi-party approval (T2/T3 require 2+ reviewers)
  - Time-based expiration (24h default)
  - Approval history and audit trail
  - Notification system integration

**4. Warrant System**
- **Location:** `apps/console-proxy/lib/warrants.js`
- **Purpose:** Issue cryptographic execution tokens
- **Features:**
  - HMAC-SHA256 signatures
  - Time-limited (TTL: 300s default)
  - Scope-bound (specific action + constraints)
  - Tamper-evident

**5. Execution Records**
- **Location:** `apps/console-proxy/api/v1/execution-records.js`
- **Purpose:** Audit trail and evidence chain
- **Features:**
  - Immutable log of all actions
  - Full context preservation (who, what, when, why)
  - Compliance reporting
  - Retention policies

**6. Event Streaming**
- **Location:** `apps/console-proxy/api/v1/events.js`
- **Purpose:** Real-time SSE feed of governance events
- **Features:**
  - Server-Sent Events (SSE)
  - Live monitoring dashboard
  - Webhook integrations

---

## Database Schema (What We Store)

**Key Tables:**
- `agent_registry` — Registered agents with permissions
- `proposals` — Pending approval requests (T1-T3)
- `warrants` — Issued execution tokens
- `executions` — Execution records (success/failure)
- `audit_log` — Immutable governance events
- `policies` — Governance rules (JSON conditions)
- `policy_evaluations` — Policy match history
- `organizations` — Multi-tenant isolation
- `users` — Operator accounts
- `api_keys` — SDK authentication

**Total:** 80+ tables in production (`regulator` schema)

---

## Risk Tier System (How It Works)

### T0: Auto-Approved
**Criteria:** Read-only, zero-risk operations  
**Examples:** Health checks, metrics queries, status reads  
**Flow:** Intent → Policy → Auto-approve → Execute → Audit  
**Speed:** <100ms

### T1: Policy-Approved
**Criteria:** Moderate-risk, routine operations  
**Examples:** Deployments, config changes, service restarts  
**Flow:** Intent → Policy → Single approval → Warrant → Execute → Verify → Audit  
**Speed:** <5 minutes (if approver available)

### T2: High-Risk, Multi-Party
**Criteria:** Financial transactions, data operations, critical changes  
**Examples:** Wire transfers >$10K, data deletion, production DB changes  
**Flow:** Intent → Policy → 2+ approvals + MFA → Warrant → Execute → Verify → Audit  
**Speed:** <24 hours (timeout escalates to T3)

### T3: Executive-Level
**Criteria:** Irreversible, critical infrastructure, regulatory implications  
**Examples:** Major contract signing, infrastructure teardown, compliance changes  
**Flow:** Intent → Policy → Board/exec approval → Warrant → Execute → Verify → Audit  
**Speed:** <72 hours (timeout auto-denies)

---

## What Agents Actually Do

### Agent Integration Pattern

**1. Agent submits intent:**
```typescript
const vienna = new ViennaClient({ endpoint: 'https://console.regulator.ai' });

const result = await vienna.submitIntent({
  agent_id: 'finance-agent',
  action: 'wire_transfer',
  payload: {
    amount: 50000,
    destination: 'vendor-bank-account',
    purpose: 'Invoice #12345'
  }
});

// result.pipeline: "pending_approval" (T2)
// result.proposal_id: "prop_abc123"
```

**2. Vienna evaluates:**
- Checks policies (`wire_transfer` + `amount > 10000` = T2)
- Creates approval request
- Notifies approvers (Slack, email, webhook)
- Waits for human review

**3. Humans approve:**
```typescript
// Approver 1 (via Console UI or API)
await vienna.approveProposal('prop_abc123', {
  reviewer_id: 'cfo@company.com',
  notes: 'Verified invoice, approved'
});

// Approver 2 (T2 requires 2+)
await vienna.approveProposal('prop_abc123', {
  reviewer_id: 'ceo@company.com',  
  notes: 'Secondary approval confirmed'
});
```

**4. Vienna issues warrant:**
```json
{
  "warrant_id": "wrt_7f3a2b1c",
  "action": "wire_transfer",
  "scope": {
    "amount": 50000,
    "destination": "vendor-bank-account"
  },
  "ttl": 300,
  "signature": "hmac-sha256:...",
  "issued_at": "2026-04-07T14:00:00Z",
  "expires_at": "2026-04-07T14:05:00Z"
}
```

**5. Agent executes with warrant:**
```typescript
// Agent uses warrant as proof of authorization
await bankingAPI.wireTransfer({
  amount: 50000,
  destination: 'vendor-bank-account',
  authorization: result.warrant
});
```

**6. Vienna verifies and audits:**
- Confirms action matched warrant scope
- Records execution result
- Generates audit evidence
- Maintains immutable trail

---

## Key Differentiators (Why Vienna OS Matters)

### vs. Traditional Guardrails
**Guardrails:** Post-execution monitoring (observe and alert)  
**Vienna OS:** Pre-execution governance (validate before action)

### vs. Runtime Execution Layers
**Execution Layer:** Run agent code (like Docker, K8s)  
**Vienna OS:** Authorize agent decisions (like IAM, Okta)

### vs. Logging/Observability
**Observability:** See what happened after it happened  
**Vienna OS:** Control what happens before it happens + full audit trail

### vs. Manual Approval Tools
**Manual Tools:** Ticket systems, spreadsheets  
**Vienna OS:** API-first, real-time, cryptographically verifiable

---

## Real-World Use Cases (What We Support)

### 1. Autonomous Finance Agent
**Scenario:** AI agent manages company cash flow  
**Risk:** Unauthorized transfers could bankrupt company  
**Vienna OS Solution:**
- T0: Daily balance checks (auto-approved)
- T1: ACH transfers <$10K (policy-approved)
- T2: Wires $10K-$100K (CFO approval + MFA)
- T3: Wires >$100K (CEO + CFO + Board notification)

### 2. DevOps Agent
**Scenario:** AI agent deploys code to production  
**Risk:** Bad deployments cause outages  
**Vienna OS Solution:**
- T0: Health checks, logs, metrics (auto-approved)
- T1: Staging deployments (policy-approved)
- T1: Canary rollouts with automatic rollback
- T2: Full production deployment (SRE approval)
- T3: Database schema migrations (architect approval)

### 3. Customer Support Agent
**Scenario:** AI handles refunds and account changes  
**Risk:** Unauthorized access to user data  
**Vienna OS Solution:**
- T0: FAQ answers, order lookup (auto-approved)
- T1: Refunds <$100 (policy-approved)
- T2: Refunds $100-$1000 (manager approval)
- T2: Account deletion (legal approval + GDPR compliance check)
- T3: Bulk data export (executive + legal approval)

### 4. Legal Document Agent
**Scenario:** AI drafts and executes contracts  
**Risk:** Binding company to unfavorable terms  
**Vienna OS Solution:**
- T0: Template selection, clause search (auto-approved)
- T1: NDA generation <$10K value (legal ops approval)
- T2: Standard contracts $10K-$100K (attorney review)
- T3: Major agreements >$100K (GC approval + board notification)

---

## What We Don't Do (Important Clarifications)

### ❌ NOT Runtime Execution
Vienna OS does NOT run agent code. Agents run on their own infrastructure (Lambda, K8s, local servers, etc.). Vienna just authorizes their decisions.

### ❌ NOT AI Model Hosting
Vienna OS does NOT host or run LLMs. Agents use their own models (OpenAI, Anthropic, Cohere, etc.). Vienna just governs their actions.

### ❌ NOT Agent Framework
Vienna OS does NOT provide agent scaffolding, memory, tools, etc. Agents use frameworks like LangChain, CrewAI, AutoGen. Vienna just adds governance layer.

### ❌ NOT Prompt Injection Defense
Vienna OS does NOT protect against prompt attacks. That's a model security problem. Vienna protects against *execution* of unauthorized actions, regardless of how the intent was formed.

### ❌ NOT LLM Output Filtering
Vienna OS does NOT filter model responses. That's a content moderation problem. Vienna validates *actions* before they execute.

---

## Technical Stack (What We Used)

**Backend:**
- Node.js + Express (Vercel serverless)
- PostgreSQL (Neon, `regulator` schema)
- HMAC-SHA256 (warrant signatures)
- JWT (auth tokens)
- Server-Sent Events (real-time streaming)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide React (icons)
- Recharts (analytics)

**SDKs:**
- `@vienna-os/sdk` (TypeScript/JavaScript)
- `vienna-os` (Python)
- Both published to npm/PyPI

**Infrastructure:**
- Vercel (marketing + console + API proxy)
- Fly.io (internal runtime, planned)
- Neon (PostgreSQL)
- GitHub Actions (CI/CD)

---

## Deployment Status (What's Live)

**Production URLs:**
- Marketing: https://regulator.ai (Next.js on Vercel)
- Console: https://console.regulator.ai (React SPA on Vercel)
- API: https://console.regulator.ai/api/v1 (Vercel serverless)

**Features Shipped:**
- ✅ Full API (28 endpoints)
- ✅ JWT authentication
- ✅ Policy engine (11 operators)
- ✅ Warrant system (HMAC-SHA256)
- ✅ Approval workflows (T0-T3)
- ✅ Audit trail
- ✅ SSE event streaming
- ✅ Multi-tenancy
- ✅ TypeScript SDK
- ✅ Python SDK
- ✅ Console UI (React)
- ✅ Stripe billing (Team $49/mo, Business $99/mo)
- ✅ OAuth (Google + GitHub)

**What's NOT Shipped:**
- ⏳ Fly.io runtime (internal feature, not required for launch)
- ⏳ Terraform provider (nice-to-have)
- ⏳ Example agents (in progress)
- ⏳ SOC 2 certification (6-12 months)

---

## Key Metrics (What We Track)

**Performance:**
- Policy evaluation: <10ms
- Warrant issuance: <50ms
- T0 approval: <100ms end-to-end
- API p99 latency: <200ms

**Scale:**
- Supports 1000+ concurrent agents
- 10,000+ intents per minute
- Multi-tenant (row-level security)
- 99.9% uptime SLA

**Security:**
- HMAC-SHA256 warrant signatures
- JWT auth tokens (1h expiry)
- Row-level tenant isolation
- Immutable audit trail
- MFA for high-risk approvals

---

## Messaging Guidelines (For Marketing)

### DO Say:
- ✅ "Governance control plane for AI agents"
- ✅ "Pre-execution validation and authorization"
- ✅ "Cryptographic warrants for high-risk actions"
- ✅ "Policy-driven approval workflows"
- ✅ "Immutable audit trail for compliance"
- ✅ "Multi-party approval for financial/critical operations"

### DON'T Say:
- ❌ "AI agent runtime" (we're not an execution environment)
- ❌ "LLM guardrails" (we're not content filtering)
- ❌ "Agent monitoring platform" (we're not observability)
- ❌ "Prompt injection defense" (that's model security)
- ❌ "Executes AI agents" (agents execute themselves, we authorize)

### Positioning:
**"Vienna OS is to AI agents what IAM is to cloud services"**
- IAM: Authorizes human/service access to cloud resources
- Vienna OS: Authorizes agent actions before execution

---

## What to Emphasize in Redesign

### Hero Section:
**Headline:** "Governance Control Plane for AI Agents"  
**Subhead:** "Approve high-risk actions before they execute. Cryptographic warrants + immutable audit trails."  
**CTA:** "Start Free Trial" (30 days, no credit card)

### Key Features:
1. **Risk Tier Classification** — T0 auto-approved, T1-T3 require human review
2. **Cryptographic Warrants** — HMAC-SHA256 signed execution tokens
3. **Multi-Party Approval** — T2/T3 require 2+ reviewers + MFA
4. **Immutable Audit Trail** — Full evidence chain for compliance
5. **Real-Time Streaming** — SSE events for live monitoring
6. **Policy Engine** — Visual builder, 11 operators, no code deployment

### Social Proof:
- USPTO Patent #64/018,152
- Open Source (BSL 1.1 → Apache 2.0 in 2030)
- Built at Cornell Law × ai.ventures
- Production-ready (Stripe billing, OAuth, multi-tenant)

### Use Cases:
- Autonomous finance agents (wire transfers, payroll)
- DevOps agents (deployments, infrastructure)
- Customer support agents (refunds, account changes)
- Legal document agents (contract generation, signing)

---

## Next Steps for Redesign

1. **Update hero messaging** — Governance control plane, not execution layer
2. **Show warrant example** — Real cryptographic token structure
3. **Explain risk tiers** — T0/T1/T2/T3 with clear examples
4. **Demonstrate approval flow** — Multi-party workflow visualization
5. **Emphasize audit trail** — Compliance and evidence chain
6. **Remove execution layer language** — We authorize, agents execute
7. **Add real use cases** — Finance, DevOps, Support, Legal
8. **Show SDK integration** — TypeScript + Python code examples

---

## Summary

**Vienna OS is a governance approval system, not an execution platform.**

We sit **between** agent intent and execution:
- Agent: "I want to transfer $50K"
- Vienna: "This requires CFO approval" → Notifies → Waits → Issues warrant
- Agent: Executes transfer with warrant proof
- Vienna: Verifies action matched warrant, logs audit trail

**The value:** Agents can be autonomous *within governance boundaries*. High-risk actions get human oversight. All actions are auditable. Organizations can deploy AI confidently because Vienna enforces policy before damage happens.

**NOT:** We don't run agents, host models, filter outputs, or monitor after-the-fact. We authorize before execution.

---

**This is what we actually built. Marketing should reflect this reality.**
