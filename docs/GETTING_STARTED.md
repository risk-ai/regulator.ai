# Getting Started with Vienna OS

**The complete developer onboarding guide for Vienna OS governance**

Welcome! This guide will take you from zero to running governed AI agents in production. Whether you're new to AI governance or migrating from another platform, we'll get you up and running fast.

---

## 🎯 **What You'll Build**

By the end of this guide, you'll have:

- **Vienna OS running locally** with web console
- **A production-ready agent** with proper governance 
- **Understanding of risk tiers** (T0-T3) and approval workflows
- **Example integrations** for your specific use case
- **Deployment knowledge** for staging and production

**Estimated time:** 30 minutes

---

## 📋 **Prerequisites**

### Required
- **Node.js 20+** ([download](https://nodejs.org/))
- **Git** for cloning repositories
- **Code editor** (VS Code, Vim, etc.)

### Optional but Recommended
- **Docker Desktop** for containerized deployment
- **PostgreSQL** for production database (SQLite works for dev)
- **Slack/Discord** for approval notifications

### API Keys (Choose One)
- **Anthropic** ([get key](https://console.anthropic.com/)) — Recommended, Claude models
- **OpenAI** ([get key](https://platform.openai.com/)) — GPT models  
- **Ollama** ([install](https://ollama.ai/)) — Free, runs locally

---

## 🚀 **Step 1: Try the 5-Minute Demo**

Before installing anything, see Vienna OS in action:

```bash
# Clone repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/examples/5-minute-quickstart

# Install and run demo (uses online sandbox)
npm install
npm start
```

This shows all governance patterns (T0-T3) using Vienna OS's demo API — no setup required.

**What you'll see:**
- T0 actions auto-approved (health checks)
- T1 actions policy-approved (deployments) 
- T2 actions requiring human approval (finance)
- T3 actions requiring executive approval (critical ops)
- Blocked actions (policy violations)

---

## 🏗️ **Step 2: Install Vienna OS Locally**

### Option A: Standard Installation (Recommended)

```bash
# Clone the main repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

**Edit `.env` and add your AI provider key:**

```bash
# Required: Choose one AI provider
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or use OpenAI instead
# OPENAI_API_KEY=sk-your-openai-key

# Or use local Ollama (free - install from https://ollama.ai/)
# OLLAMA_BASE_URL=http://localhost:11434

# Note: Anthropic (Claude) is recommended for best governance reasoning
```

**Start Vienna OS:**

```bash
npm run dev
```

**Verify it's working:**
- Backend: http://localhost:3100/api/v1/health
- Frontend: http://localhost:5173

### Option B: Docker Installation (Advanced)

```bash
# Clone and enter directory
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai

# Create environment file for Docker
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start with Docker Compose
docker compose up
```

This starts:
- Vienna OS backend (localhost:3100)
- Web console (localhost:5173)  
- PostgreSQL database (localhost:5432)

---

## 🤖 **Step 3: Create Your First Governed Agent**

Let's build a real agent that demonstrates governance patterns.

### Create Project

```bash
mkdir my-vienna-agent
cd my-vienna-agent
npm init -y
npm install @vienna-os/sdk dotenv
```

### Write the Agent

**Create `agent.js`:**

```javascript
import { ViennaClient } from '@vienna-os/sdk';
import 'dotenv/config';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_API_URL || 'http://localhost:3100',
  apiKey: process.env.VIENNA_API_KEY
});

class MyFirstAgent {
  constructor() {
    this.agentId = 'my-first-agent';
  }

  async initialize() {
    // Register with Vienna OS
    await vienna.registerAgent({
      id: this.agentId,
      name: 'My First Governed Agent',
      type: 'demo-agent',
      description: 'Learning Vienna OS governance patterns',
      default_tier: 'T1',
      capabilities: ['read', 'write', 'analyze']
    });
    
    console.log('✅ Agent registered with Vienna OS');
  }

  async runTasks() {
    console.log('\\n🤖 Running governed tasks...\\n');
    
    // Task 1: Low-risk read (T0 - auto-approved)
    console.log('━━━ Task 1: System Health Check (T0) ━━━');
    const healthResult = await vienna.submitIntent({
      agent_id: this.agentId,
      action: 'health_check',
      payload: { systems: ['api', 'database'] },
      risk_tier: 'T0'
    });
    
    this.logResult(healthResult, 'Health check');
    
    // Task 2: Medium-risk operation (T1 - policy approval)
    console.log('\\n━━━ Task 2: Update Configuration (T1) ━━━');
    const configResult = await vienna.submitIntent({
      agent_id: this.agentId,
      action: 'update_config',
      payload: { 
        service: 'user-api',
        changes: { max_connections: 100 }
      },
      risk_tier: 'T1'
    });
    
    this.logResult(configResult, 'Config update');
    
    // Task 3: High-risk operation (T2 - human approval)
    console.log('\\n━━━ Task 3: Delete User Data (T2) ━━━');
    const deleteResult = await vienna.submitIntent({
      agent_id: this.agentId,
      action: 'delete_user_data',
      payload: {
        user_id: 'demo-user-123',
        reason: 'GDPR deletion request',
        backup_created: true
      },
      risk_tier: 'T2'
    });
    
    this.logResult(deleteResult, 'Data deletion');
  }

  logResult(result, taskName) {
    const { pipeline, risk_tier, warrant, proposal } = result;
    
    console.log(`  📊 Status: ${pipeline} (${risk_tier})`);
    
    if (pipeline === 'executed') {
      console.log(`  ✅ Approved and executed`);
      console.log(`  🎫 Warrant: ${warrant?.id}`);
    } else if (pipeline === 'pending_approval') {
      console.log(`  ⏳ Awaiting human approval`);
      console.log(`  🆔 Proposal: ${proposal?.id}`);
      console.log(`  🔗 Approve at: http://localhost:5173/approvals`);
    } else {
      console.log(`  ❌ ${pipeline}: ${result.reason}`);
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.runTasks();
      
      console.log('\\n🎯 All tasks completed!');
      console.log('📱 Check the Vienna OS console: http://localhost:5173');
      
    } catch (error) {
      console.error('💥 Agent failed:', error.message);
    }
  }
}

// Run the agent
new MyFirstAgent().run();
```

### Create Environment File

**Create `.env`:**

```bash
# For local development (no auth needed)
VIENNA_API_URL=http://localhost:3100
VIENNA_API_KEY=dev_key_no_auth_needed

# For production, get your API key from Vienna OS console
# VIENNA_API_KEY=vos_your_production_key_here
```

### Run Your Agent

```bash
node agent.js
```

**Expected output:**

```
✅ Agent registered with Vienna OS

🤖 Running governed tasks...

━━━ Task 1: System Health Check (T0) ━━━
  📊 Status: executed (T0)  
  ✅ Approved and executed
  🎫 Warrant: wrt_abc123

━━━ Task 2: Update Configuration (T1) ━━━
  📊 Status: executed (T1)
  ✅ Approved and executed  
  🎫 Warrant: wrt_def456

━━━ Task 3: Delete User Data (T2) ━━━
  📊 Status: pending_approval (T2)
  ⏳ Awaiting human approval
  🆔 Proposal: prop_ghi789
  🔗 Approve at: http://localhost:5173/approvals

🎯 All tasks completed!
📱 Check the Vienna OS console: http://localhost:5173
```

---

## 🎨 **Step 4: Explore the Web Console**

Open http://localhost:5173 to see:

### Dashboard
- **Active agents** and their status
- **Recent intents** and outcomes  
- **Pending approvals** requiring human review
- **System health** and metrics

### Agents Tab
- **Register new agents** with capabilities
- **Modify agent configs** and permissions
- **View agent activity** and audit trails

### Policies Tab  
- **Create governance rules** with visual editor
- **Set approval requirements** by risk tier
- **Configure notification channels** (Slack, email)

### Approvals Tab
- **Review pending intents** requiring human approval
- **Approve/reject** with reasoning
- **View warrant details** and execution constraints

### Audit Tab
- **Complete audit trails** for compliance
- **Execution evidence** with cryptographic proofs
- **Export reports** for SOX/FINRA/SOC2

---

## 📚 **Step 5: Understanding Risk Tiers**

Vienna OS classifies every agent action by risk level:

### T0: Minimal Risk (Auto-Approved)
- **Examples:** Health checks, reading config, status queries
- **Approval:** Instant, no human needed
- **Use cases:** Monitoring, observability, reporting

```javascript
await vienna.submitIntent({
  action: 'read_metrics', 
  risk_tier: 'T0'  // Auto-approved
});
```

### T1: Low Risk (Policy-Approved)
- **Examples:** Config updates, service restarts, deployments to staging
- **Approval:** Policy engine validates, usually instant
- **Use cases:** DevOps automation, configuration management

```javascript  
await vienna.submitIntent({
  action: 'deploy_staging',
  risk_tier: 'T1'  // Policy approval
});
```

### T2: Medium Risk (Human-Approved)
- **Examples:** Production deployments, financial transactions, data changes
- **Approval:** Single human operator + optional MFA
- **Use cases:** Production changes, finance operations

```javascript
await vienna.submitIntent({
  action: 'wire_transfer',
  payload: { amount: 50000 },
  risk_tier: 'T2'  // Human approval required
});
```

### T3: High Risk (Executive-Approved)  
- **Examples:** Infrastructure changes, regulatory actions, major contracts
- **Approval:** Multiple executives, board notification
- **Use cases:** Critical infrastructure, legal/regulatory

```javascript
await vienna.submitIntent({
  action: 'change_database_schema',
  payload: { production: true },
  risk_tier: 'T3'  // Executive approval required
});
```

---

## 🔧 **Step 6: Production Deployment**

### Environment Setup

**Create `.env.production`:**

```bash
# Server config
NODE_ENV=production
PORT=3100
API_BASE_URL=https://vienna.yourcompany.com

# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://user:pass@host:5432/vienna_prod

# AI Provider (required)
ANTHROPIC_API_KEY=sk-ant-prod-key-here

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-super-secure-session-secret

# CORS (adjust for your frontend domain)
CORS_ORIGIN=https://console.yourcompany.com,https://vienna.yourcompany.com

# Notifications
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SMTP_HOST=smtp.yourcompany.com
SMTP_USER=vienna@yourcompany.com
SMTP_PASSWORD=your-smtp-password
```

### Deploy to Cloud

**Option A: Vercel (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (first time setup)
vercel

# Deploy updates
vercel --prod
```

**Option B: AWS/GCP/Azure**

```bash
# Build for production
npm run build

# Create Docker image  
docker build -t vienna-os:latest .

# Deploy to your cloud provider
# (specific commands depend on your provider)
```

### Database Setup

```bash
# Run migrations (first deployment)
npm run migrate

# Verify health
curl https://vienna.yourcompany.com/api/v1/health
```

---

## 🔍 **Step 7: Real-World Examples**

Now that you understand the basics, explore production-ready examples:

### DevOps Automation
```bash
cd examples/governed-devops-agent
npm install
npm start
```
- Deployment pipelines with approval workflows
- Infrastructure changes with rollback plans  
- Automated scaling with safety limits

### Financial Operations
```bash
cd examples/governed-finance-agent  
pip install -r requirements.txt
python agent.py
```
- Wire transfers with BSA/AML compliance
- Trading operations with FINRA controls
- Regulatory reporting with audit trails

### Regulatory Monitoring
```bash
cd examples/regulatory-monitor
npm install
npm start
```
- Automated compliance monitoring
- Policy impact analysis
- Alert generation with governance

---

## 📖 **Next Steps**

### Learn More
- **[API Reference](./API_REFERENCE.md)** — Complete SDK documentation
- **[Architecture Guide](./ARCHITECTURE.md)** — How Vienna OS works internally
- **[Security](./SECURITY.md)** — Cryptographic warrants, audit trails
- **[Deployment](./DEPLOYMENT.md)** — Production setup, scaling, monitoring

### Framework Integrations
- **[OpenClaw Integration](./OPENCLAW-INTEGRATION.md)** — Add governance to OpenClaw agents
- **[LangChain Integration](../examples/langchain/)** — Governed LangChain workflows
- **[CrewAI Integration](../examples/crewai/)** — Multi-agent governance patterns

### Production Patterns
- **[SOX Compliance](./SOC2-CONTROLS.md)** — Financial reporting governance
- **[FINRA Controls](../examples/governed-finance-agent/)** — Trading compliance
- **[DevOps Safety](../examples/governed-devops-agent/)** — Infrastructure governance

### Community
- **[Discord](https://discord.gg/vienna-os)** — Community support and discussions
- **[GitHub](https://github.com/risk-ai/regulator.ai)** — Source code, issues, contributions  
- **[Blog](https://regulator.ai/blog)** — Architecture deep dives, case studies

---

## 🆘 **Troubleshooting**

### Vienna OS won't start

**Check your AI provider key:**
```bash
# Test Anthropic key
curl https://api.anthropic.com/v1/models \\
  -H "Authorization: Bearer $ANTHROPIC_API_KEY"

# Test OpenAI key  
curl https://api.openai.com/v1/models \\
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Check your environment:**
```bash
node --version  # Should be 20+
npm --version   # Should be 10+ 
```

### Agent registration fails

**Verify Vienna OS is running:**
```bash
curl http://localhost:3100/api/v1/health
```

**Check your API key configuration:**
```bash
echo $VIENNA_API_KEY  # Should not be empty
```

### Approvals not working

**Verify web console access:**
- Open http://localhost:5173/approvals
- Check browser console for errors
- Ensure Slack/email notifications are configured

### Database connection issues

**SQLite (development):**
```bash
# Check file permissions
ls -la ~/.vienna/state/
```

**PostgreSQL (production):**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### Common Error Messages

**"ANTHROPIC_API_KEY not found"**
- Add your API key to `.env` file
- Restart Vienna OS after adding the key

**"Cannot connect to Vienna OS"**
- Ensure Vienna OS is running on correct port
- Check firewall/network connectivity
- Verify VIENNA_API_URL in your agent

**"Agent already exists"**
- This is usually fine, agent registration is idempotent
- Use a different agent ID if you want multiple instances

**"Warrant signature invalid"**
- Clock drift between systems
- Regenerate warrant by resubmitting intent
- Check JWT_SECRET consistency

---

## 🎯 **Summary**

You now have:

✅ **Vienna OS running locally** with web interface  
✅ **Your first governed agent** demonstrating all risk tiers  
✅ **Understanding of governance patterns** and approval workflows  
✅ **Knowledge of production deployment** options  
✅ **Real-world examples** for your specific use case  

**Vienna OS transforms AI from "fire and forget" to "governed and verified"** — giving you the safety to deploy autonomous agents at scale.

Ready to govern your agents? 🏛️

---

**Next:** [Build a Production Agent →](../examples/governed-devops-agent/README.md)

**Need help?** Join our [Discord](https://discord.gg/vienna-os) or [open an issue](https://github.com/risk-ai/regulator.ai/issues).