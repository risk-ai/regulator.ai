# Vienna OS

<div align="center">

```
██╗   ██╗██╗███████╗███╗   ███╗███╗   ██╗ █████╗      ██████╗ ███████╗
██║   ██║██║██╔════╝████╗ ████║████╗  ██║██╔══██╗    ██╔═══██╗██╔════╝
██║   ██║██║█████╗  ██╔████╔██║██╔██╗ ██║███████║    ██║   ██║███████╗
╚██╗ ██╔╝██║██╔══╝  ██║╚██╔╝██║██║╚██╗██║██╔══██║    ██║   ██║╚════██║
 ╚████╔╝ ██║███████╗██║ ╚═╝ ██║██║ ╚████║██║  ██║    ╚██████╔╝███████║
  ╚═══╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝
```

[![npm](https://img.shields.io/npm/v/@vienna-os/sdk?color=cb3837&logo=npm)](https://www.npmjs.com/package/@vienna-os/sdk)
[![PyPI](https://img.shields.io/pypi/v/vienna-sdk?color=3775A9&logo=pypi&logoColor=white)](https://pypi.org/project/vienna-sdk/)
[![License](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/risk-ai/regulator.ai?style=social)](https://github.com/risk-ai/regulator.ai/stargazers)
[![Build Status](https://img.shields.io/github/actions/workflow/status/risk-ai/regulator.ai/ci.yml?branch=main&logo=github)](https://github.com/risk-ai/regulator.ai/actions)
[![Discord](https://img.shields.io/discord/1234567890?color=7289da&logo=discord&logoColor=white)](https://discord.gg/vienna-os)

**🧠 The governance layer AI agents answer to.**

Vienna OS is the first execution control plane designed specifically for autonomous AI systems. It sits between agent intent and execution, ensuring every action is validated, authorized, and auditable before it happens.

[🚀 Quick Start](#-quick-start) • [📖 Docs](https://docs.regulator.ai) • [🎮 Live Demo](https://demo.regulator.ai) • [💬 Discord](https://discord.gg/vienna-os)

</div>

---

## 🤖 What is Vienna OS?

Vienna OS transforms ungoverned AI agents into production-ready systems with complete accountability. Instead of agents executing actions directly, they submit execution intents to Vienna OS, which evaluates risk, enforces policy, and issues cryptographic warrants for approved actions.

**Think of it as:** *Search warrants for AI agents* — temporary, scoped permissions that prove authorization and create tamper-evident audit trails.

## 🏗️ Architecture

```
    AI Agent                Vienna OS                 Your Systems
    ┌─────────┐            ┌─────────────────────────┐    ┌─────────────┐
    │ Intent  │ submit     │  ┌─────────┐ ┌────────┐ │    │             │
    │ "Scale  │ ─────────▶ │  │ Policy  │ │ Risk   │ │    │ ┌─────────┐ │
    │  API"   │            │  │ Engine  │ │ Tier   │ │    │ │ AWS API │ │
    └─────────┘            │  └─────────┘ └────────┘ │    │ └─────────┘ │
                           │  ┌─────────┐ ┌────────┐ │    │ ┌─────────┐ │
    ┌─────────┐            │  │Approval │ │Warrant │ │    │ │Database │ │
    │Execution│ ◀──────────│  │Workflow │ │Signing │ │───▶│ └─────────┘ │
    │ Result  │   warrant  │  └─────────┘ └────────┘ │    │ ┌─────────┐ │
    └─────────┘            │         +               │    │ │ Email   │ │
                           │  ┌─────────────────────┐ │    │ │ Service │ │
                           │  │   Audit Trail       │ │    │ └─────────┘ │
                           │  │ (Cryptographic)     │ │    └─────────────┘
                           │  └─────────────────────┘ │
                           └─────────────────────────┘

Flow: Intent → Policy → Risk → Approval → Warrant → Execution → Audit
```

## 🚀 Quick Start

### Installation

```bash
# Node.js / TypeScript
npm install @vienna-os/sdk

# Python
pip install vienna-sdk

# Go
go get github.com/vienna-os/go-sdk
```

### 10-Line Integration

```typescript
import { ViennaClient } from '@vienna-os/sdk';

// 1. Initialize Vienna OS client
const vienna = new ViennaClient({ 
  endpoint: 'https://api.regulator.ai',
  apiKey: process.env.VIENNA_API_KEY 
});

// 2. Submit intent instead of direct execution
const result = await vienna.submitIntent({
  action: 'deploy_service',
  payload: { service: 'api', version: '1.2.3' },
  justification: 'Bug fix deployment'
});

// 3. Vienna OS handles governance automatically
if (result.approved) {
  console.log('✅ Action approved and executed');
} else {
  console.log('⏳ Awaiting approval:', result.warrant_id);
}
```

That's it! Your AI agents now operate under complete governance.

## ✨ Features

### 🔐 **Cryptographic Warrants**
Time-limited execution tokens with HMAC-SHA256 signatures that bind together system state, execution plan, and approval evidence.

### ⚡ **4-Tier Risk Classification**
| Tier | Risk Level | Examples | Approval |
|------|------------|----------|----------|
| **T0** | Minimal | Health checks, reads | Auto-approve |
| **T1** | Moderate | Config changes, internal emails | 1 person |
| **T2** | High | Deployments, scaling | 2+ people |
| **T3** | Critical | Financial transactions | Executives |

### 🎯 **Policy-as-Code Engine**
Visual policy builder with 11+ operators for creating governance rules:

```javascript
IF action == "wire_transfer" 
AND payload.amount > $50000
THEN require_approval tier=T2
     AND notify channels=[compliance, cfo]
     AND require_mfa=true
```

### 📡 **Real-Time Event Streaming**
Server-sent events for live monitoring of agent activities, policy matches, and approval workflows.

### 🏢 **Multi-Tenant Architecture**
Complete tenant isolation supporting multiple organizations on a single Vienna OS instance.

### 🛡️ **SOC 2 & Compliance Ready**
Built-in compliance reporting and audit trail generation for security certifications.

## 🔧 Framework Integrations

### OpenClaw
```javascript
import { withVienna } from '@vienna-os/openclaw';

export default withVienna({
  riskTier: 'T2',
  approvers: ['devops-team']
})(async function deploy({ service }) {
  await kubectl.apply(`deployment/${service}`);
});
```

### LangChain
```python
from vienna_os.langchain import ViennaTool

class DeploymentTool(ViennaTool):
    name = "deploy_service"
    risk_tier = "T2"
    
    def _run(self, service: str) -> str:
        # Runs only after Vienna approval
        return deploy_to_k8s(service)
```

### CrewAI
```python
from vienna_os.crewai import ViennaGoverned

@ViennaGoverned(risk_tier='T2')
class TradingCrew(Crew):
    def execute_trade(self, symbol, quantity):
        # Crew runs only after governance approval
        return self.execute_trading_strategy()
```

### AutoGen
```python
from vienna_os.autogen import govern_conversation

@govern_conversation(risk_tier='T1')
def financial_analysis_chat():
    user_proxy >> analyst >> trader >> user_proxy
```

## 📊 Comparison

| Feature | Vienna OS | Guardrails AI | Arthur AI | Manual Governance |
|---------|-----------|---------------|-----------|-------------------|
| **Pre-execution Control** | ✅ Complete | ❌ Post-hoc | ❌ Monitoring only | ✅ Manual only |
| **Risk-Based Approval** | ✅ 4-tier system | ❌ Binary | ❌ Score only | ✅ Ad-hoc |
| **Cryptographic Audit** | ✅ HMAC-SHA256 | ❌ Logs only | ❌ Metrics only | ❌ None |
| **Multi-Framework** | ✅ 4+ integrations | ✅ LangChain focus | ❌ Limited | ❌ Custom |
| **Real-time Approvals** | ✅ Slack/Teams/API | ❌ None | ❌ None | ✅ Email/Chat |
| **Policy as Code** | ✅ Visual + YAML | ✅ Python only | ✅ Config only | ❌ Documentation |
| **Rollback Support** | ✅ Automatic | ❌ Manual | ❌ None | ❌ Manual |

**The difference:** Vienna OS prevents problems before they happen, while others detect them after.

## 🌟 Why Vienna OS?

### Before Vienna OS: The 3AM Kubernetes Incident
> *"Our cost optimization agent decided to 'help' during a traffic spike by scaling our API from 10 to 200 instances. We woke up to a $47,000 AWS bill and angry customers. There was no approval, no oversight, no way to prove what happened or who authorized it."*
> 
> — DevOps Engineer at FinTech Startup

### After Vienna OS: Governance That Actually Works
> *"Same scenario, different outcome. The agent submitted an intent to scale infrastructure. Vienna OS classified it as T2 risk, requiring two approvals. Our team reviewed it, realized the cost impact, and approved scaling to 25 instances instead. Crisis averted, money saved, sleep preserved."*
> 
> — DevOps Engineer at FinTech Startup (6 months later)

## 🔗 Links

- **📚 [Documentation](https://docs.regulator.ai)** — Complete setup and API reference
- **🎮 [Live Demo](https://demo.regulator.ai)** — Try Vienna OS with sample agents
- **🖥️ [Management Console](https://console.regulator.ai)** — Deploy and manage your instance
- **💬 [Discord Community](https://discord.gg/vienna-os)** — Support and discussions
- **📝 [Blog](https://blog.regulator.ai)** — Architecture deep-dives and case studies
- **💰 [Pricing](https://regulator.ai/pricing)** — Free tier + enterprise options

## 🤝 Contributing

We welcome contributions! Vienna OS is open-source and built in public.

### 🎯 High-Impact Areas
- **🔧 Adapters** — New integrations (AWS, GCP, Slack, GitHub)
- **🛠️ SDKs** — Go, Rust, Java client libraries
- **🤖 Framework Support** — More agent frameworks
- **📊 Policy Templates** — Pre-built governance rules
- **📖 Documentation** — Guides and tutorials

### 🚀 Getting Started
```bash
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai
npm install
npm test
npm run dev
```

### 📋 Process
1. **Fork & clone** the repository
2. **Create feature branch** from `main`
3. **Make changes** with tests
4. **Run linting**: `npm run lint:fix`
5. **Submit PR** with clear description
6. **Address reviews** and merge!

**Code Style:** TypeScript + ESLint + Prettier  
**Testing:** Jest + integration tests  
**Commits:** Conventional commits

All contributors agree to our [CLA](CLA.md).

## 📄 License

**Business Source License 1.1 (BSL-1.1)**

- ✅ **Free for evaluation, testing, and development**
- ✅ **Source code is fully transparent and inspectable**
- 💼 **Production use requires a commercial license** — [Contact us](mailto:sales@regulator.ai)
- 🔓 **Converts to Apache 2.0 on March 28, 2030** (4 years)

This protects our work while keeping the code open for learning and non-production use. See [LICENSE](LICENSE) for full terms.

---

<div align="center">

## 🚀 Built by ai.ventures × Cornell Law

Vienna OS is developed by **[ai.ventures](https://ai.ventures)** in partnership with **Cornell Law School's AI Policy Institute**.

*Combining Silicon Valley execution speed with Ivy League legal rigor.*

---

### **Govern your agents. Ship with confidence.**

**🌐 [vienna-os.com](https://vienna-os.com) • 📧 [hello@vienna-os.com](mailto:hello@vienna-os.com) • 🐙 [GitHub](https://github.com/risk-ai/regulator.ai)**

</div>