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
- **Anthropic API key** ([get one](https://console.anthropic.com/))

**Time required:** 15 minutes

---

## Step 1: Clone Repository (2 min)

```bash
git clone https://github.com/vienna-os/core.git
cd core
```

**Or start from scratch:**

```bash
mkdir my-vienna-agent
cd my-vienna-agent
npm init -y
npm install @vienna/lib
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
const { StateGraph, IntentGateway, Executor } = require('@vienna/lib');

// Initialize Vienna OS components
const stateGraph = new StateGraph({ 
  environment: 'dev',
  dbPath: './vienna-dev.db'
});

const intentGateway = new IntentGateway({ stateGraph });
const executor = new Executor({ stateGraph });

// Initialize
await stateGraph.initialize();

// Submit governed intent
const intent = {
  action: 'check_health',
  description: 'Check if all services are operational',
  parameters: {
    services: ['api', 'database']
  },
  source: 'cli',
  metadata: {
    operator: 'quickstart-user'
  }
};

// Execute with governance
const result = await intentGateway.submitIntent(intent);

console.log('Result:', JSON.stringify(result, null, 2));

// View warrant (authorization + reasoning)
const warrant = result.warrant;
console.log('\\nWarrant ID:', warrant.id);
console.log('Approved:', warrant.approved);
console.log('Reasoning:', warrant.reasoning);

// View audit trail
const ledger = await stateGraph.getExecutionLedger(result.execution_id);
console.log('\\nAudit Trail:', ledger.events.length, 'events');
```

---

## Step 4: Run Your Agent (1 min)

```bash
node agent.js
```

**Expected output:**

```json
{
  "success": true,
  "execution_id": "exec_abc123",
  "status": "success",
  "result": {
    "services_checked": 2,
    "all_healthy": true,
    "details": [
      {"service": "api", "status": "healthy"},
      {"service": "database", "status": "healthy"}
    ]
  },
  "warrant": {
    "id": "warrant_def456",
    "approved": true,
    "reasoning": "Low-risk health check operation, auto-approved"
  },
  "timestamp": "2026-03-26T14:15:00Z"
}

Warrant ID: warrant_def456
Approved: true
Reasoning: Low-risk health check operation, auto-approved

Audit Trail: 4 events
```

**Congratulations!** You just executed your first governed AI agent.

---

## Step 5: Add Custom Action (5 min)

Let's add a custom action with risk validation.

**Update `agent.js`:**

```javascript
// Register custom action
stateGraph.registerAction({
  action_type: 'restart_service',
  name: 'Restart Service',
  description: 'Restart a system service',
  risk_tier: 'T1',  // Requires approval
  parameters_schema: {
    type: 'object',
    properties: {
      service_name: { type: 'string' }
    },
    required: ['service_name']
  }
});

// Submit high-risk intent
const riskyIntent = {
  action: 'restart_service',
  description: 'Restart API server',
  parameters: {
    service_name: 'api'
  },
  source: 'cli',
  metadata: {
    operator: 'quickstart-user'
  }
};

const result = await intentGateway.submitIntent(riskyIntent);

if (result.status === 'pending_approval') {
  console.log('⚠️  Action requires approval (T1 risk tier)');
  console.log('Warrant ID:', result.warrant_id);
  
  // Approve warrant
  await stateGraph.approveWarrant(result.warrant_id, {
    approved_by: 'quickstart-user',
    reasoning: 'Approved for testing'
  });
  
  // Execute
  const finalResult = await executor.executeWarrant(result.warrant_id);
  console.log('✅ Execution complete:', finalResult.status);
} else {
  console.log('Result:', result);
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
