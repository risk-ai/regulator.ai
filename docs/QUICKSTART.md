# Vienna OS Quickstart Guide

**Get started with Vienna OS in 15 minutes**

---

## What You'll Build

A simple governed AI agent that:
1. Accepts a task (e.g., "check system health")
2. Generates an execution warrant (authorization + reasoning)
3. Executes the task with full audit trail
4. Returns results with attestation

**Use case:** Health monitoring agent with fail-closed safety

---

## Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **npm** 10+  
- **Anthropic API key** ([get one](https://console.anthropic.com/)) — Required for AI-powered governance

**Time required:** 15 minutes

---

## Step 1: Clone Repository (2 min)

```bash
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
npm install
```

**Or start from scratch:**

```bash
mkdir my-vienna-agent
cd my-vienna-agent
npm init -y
npm install @vienna-os/sdk
```

---

## Step 2: Configure Environment (2 min)

Create `.env` file:

```bash
cp .env.example .env
```

**Edit `.env` and add:**

```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional (use defaults)
PORT=3100
LOG_LEVEL=info
VIENNA_ENV=dev
```

---

## Step 3: Create Your First Agent (5 min)

Create `agent.js`:

```javascript
import { ViennaClient } from '@vienna-os/sdk';

// Initialize Vienna OS client
const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_API_URL || 'http://localhost:3100',
  apiKey: process.env.VIENNA_API_KEY
});

console.log('🤖 Vienna OS client initialized');

// Submit governed intent
const intent = {
  agent_id: 'quickstart-agent',
  action: 'check_health',
  payload: {
    services: ['api', 'database']
  },
  metadata: {
    operator: 'quickstart-user',
    source: 'cli'
  }
};

// Execute with governance
const result = await vienna.submitIntent(intent);

console.log('Result:', JSON.stringify(result, null, 2));

// Check execution status
if (result.pipeline === 'executed') {
  console.log('✅ Action executed successfully');
  console.log('Warrant ID:', result.warrant?.id);
} else if (result.pipeline === 'pending_approval') {
  console.log('⏳ Action pending approval');
  console.log('Proposal ID:', result.proposal?.id);
} else {
  console.log('❌ Action blocked:', result.reason);
}
```

---

## Step 4: Run Your Agent (1 min)

```bash
node agent.js
```

**Expected output:**

```json
{
  "pipeline": "executed",
  "intent_id": "intent_abc123",
  "warrant": {
    "id": "warrant_def456",
    "action": "check_health",
    "risk_tier": "T0",
    "approved": true,
    "reasoning": "Low-risk health check operation, auto-approved"
  },
  "risk_tier": "T0",
  "execution_time_ms": 245
}

✅ Action executed successfully
Warrant ID: warrant_def456
```

**Congratulations!** You just executed your first governed AI agent.

---

## Step 5: Add Custom Action (5 min)

Let's add a custom action with risk validation.

**Update `agent.js`:**

```javascript
// Submit higher-risk intent (requires approval)
const riskyIntent = {
  agent_id: 'quickstart-agent',
  action: 'restart_service',
  payload: {
    service_name: 'api',
    force_restart: true
  },
  risk_tier: 'T1', // Override automatic classification
  metadata: {
    operator: 'quickstart-user',
    justification: 'Testing approval workflow'
  }
};

const result = await vienna.submitIntent(riskyIntent);

if (result.pipeline === 'pending_approval') {
  console.log('⚠️  Action requires approval (T1 risk tier)');
  console.log('Proposal ID:', result.proposal?.id);
  console.log('🔗 Approve at: http://localhost:5173/approvals');
  
  // In production, approval happens through UI or separate API call
  console.log('⏳ Waiting for human approval...');
  
} else if (result.pipeline === 'executed') {
  console.log('✅ Action auto-approved and executed');
} else {
  console.log('❌ Action blocked:', result.reason);
}
```

**Key concepts demonstrated:**

1. **Risk tiers:** T0 (auto-approve), T1 (requires approval), T2 (multi-party)
2. **Warrants:** Every high-risk action requires explicit authorization
3. **Fail-closed:** Agent pauses and escalates instead of executing blindly

---

## What Just Happened?

**Vienna OS provided:**

1. **Intent validation** — Schema checks, source verification
2. **Risk classification** — Automatic T0/T1/T2 assignment
3. **Warrant generation** — Authorization + reasoning + timestamp
4. **Approval workflow** — Pause for human review (T1/T2)
5. **Audit trail** — Immutable log of every step
6. **Attestation** — Cryptographic proof of execution

**All in <50 lines of code.**

---

## Next Steps

### Learn More

**Core concepts:**
- [Architecture Overview](./ARCHITECTURE.md) — Warrant system, agent orchestration
- [API Reference](./API_REFERENCE.md) — Complete API documentation
- [Deployment Guide](./DEPLOYMENT.md) — Deploy to production

**Sample apps:**
- [Regulatory Monitoring Bot](../examples/regulatory-monitor/) — Real-world use case
- [Trading Signal Agent](../examples/trading-agent/) — High-stakes orchestration
- [Legal Research Assistant](../examples/legal-research/) — Evidence-based reasoning

### Build Something Real

**Ideas:**

1. **Compliance automation** — Monitor regulatory changes, auto-alert affected teams
2. **Trading bot** — Execute trades with risk limits and audit trail
3. **DevOps agent** — Infrastructure changes with rollback plans
4. **Legal research** — Case law analysis with citation validation

### Join the Community

- **GitHub:** https://github.com/vienna-os/core
- **Discord:** https://discord.gg/vienna-os
- **Docs:** https://docs.vienna-os.com
- **Twitter:** @vienna_os

---

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not found"

**Solution:** Add API key to `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Error: "Database initialization failed"

**Solution:** Ensure write permissions:

```bash
mkdir -p ~/.vienna/state
chmod 755 ~/.vienna/state
```

### Error: "Action not registered"

**Solution:** Register custom actions before submitting intents:

```javascript
await stateGraph.registerAction({
  action_type: 'your_action',
  ...
});
```

### Agent runs slowly

**Solution:** Use local Ollama for development (faster, free):

```env
OLLAMA_BASE_URL=http://localhost:11434
```

---

## What Makes Vienna OS Different?

**vs. LangChain / AutoGPT / CrewAI:**

| Feature | Vienna OS | Others |
|---------|-----------|--------|
| **Governance** | Warrant system (transactional authorization) | None (fire-and-forget) |
| **Safety** | Fail-closed (pause on uncertainty) | Fail-open (continue blindly) |
| **Audit** | Immutable trail + attestation | Logs only |
| **Risk** | T0/T1/T2 classification + approval workflow | Manual implementation |
| **Production** | Enterprise-ready (SOC2, SLA, rollback) | Experimental |

**Vienna OS is built for high-stakes workflows where mistakes are unacceptable:**
- Trading systems (financial risk)
- Healthcare workflows (patient safety)
- Legal research (malpractice liability)
- Compliance automation (regulatory enforcement)

---

**Time to first agent:** 15 minutes ✅  
**Lines of code:** <50 ✅  
**Production-ready:** Yes ✅

**Welcome to Vienna OS** 🏛

---

**Last Updated:** 2026-03-26  
**Version:** 8.0.0
