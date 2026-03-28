# Vienna OS

```
██╗   ██╗██╗███████╗███╗   ███╗███╗   ██╗ █████╗      ██████╗ ███████╗
██║   ██║██║██╔════╝████╗ ████║████╗  ██║██╔══██╗    ██╔═══██╗██╔════╝
██║   ██║██║█████╗  ██╔████╔██║██╔██╗ ██║███████║    ██║   ██║███████╗
╚██╗ ██╔╝██║██╔══╝  ██║╚██╔╝██║██║╚██╗██║██╔══██║    ██║   ██║╚════██║
 ╚████╔╝ ██║███████╗██║ ╚═╝ ██║██║ ╚████║██║  ██║    ╚██████╔╝███████║
  ╚═══╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝     ╚═════╝ ╚══════╝
```

[![npm](https://img.shields.io/npm/v/@vienna-os/sdk?color=cb3837&logo=npm)](https://www.npmjs.com/package/@vienna-os/sdk)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Build Status](https://img.shields.io/github/actions/workflow/status/risk-ai/regulator.ai/ci.yml?branch=main&logo=github)](https://github.com/risk-ai/regulator.ai/actions)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/risk-ai/regulator.ai?style=social)](https://github.com/risk-ai/regulator.ai/stargazers)

**The governance layer AI agents answer to.**

Vienna OS is the first execution control plane designed specifically for autonomous AI systems. It sits between agent intent and execution, ensuring every action is validated, authorized, and auditable before it happens.

---

## The Problem

AI agents are increasingly autonomous — managing cloud infrastructure, executing financial trades, controlling IoT devices, and making business decisions. But most agentic systems today operate without meaningful governance:

- **🚨 No pre-execution validation** — Agents can cause damage before anyone notices
- **⚠️ No risk-based authorization** — High-stakes actions get the same treatment as low-risk ones
- **📝 No verifiable audit trails** — When something goes wrong, there's no clear record of what happened or who authorized it
- **🔒 No policy enforcement** — Governance rules exist in documentation, not in the execution path

This creates an unacceptable risk profile for production AI systems handling real-world consequences.

**Vienna OS changes that.**

---

## What Vienna OS Does

Vienna OS implements a **governance-first architecture** that creates a control plane between AI agent intent and actual execution. Every agent action flows through a standardized pipeline:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   AI Agent  │───▶│   Gateway    │───▶│   Policy    │───▶│   Warrant    │
│  (Intent)   │    │ (Validation) │    │  (Evaluation)│    │(Authorization)│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Audit Trail │◀───│   Executor   │◀───│ Verification│◀───│ Risk Assessment│
│ (Evidence)  │    │ (Execution)  │    │ (Attestation)│    │  (Tier T0-T3) │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

Instead of agents executing actions directly, they submit **intents** to Vienna OS, which:
1. **Validates** the request structure and source
2. **Evaluates** it against policy rules  
3. **Classifies** risk tier and approval requirements
4. **Issues warrants** for approved high-risk actions
5. **Executes** through controlled adapters
6. **Verifies** completion and generates audit evidence
7. **Maintains** cryptographic proof of governance

---

## Key Features

### 🔐 **Cryptographic Warrants**
Time-limited, scoped execution tokens using HMAC-SHA256 signatures that bind together:
- Current system state preconditions
- Specific execution plan
- Authorized operator approval
- Rollback procedures

### ⚡ **4-Tier Risk Classification**
| Tier | Risk Level | Approval Process | Examples |
|------|------------|------------------|----------|
| **T0** | Minimal | Auto-approve | Health checks, read operations |
| **T1** | Moderate | Single operator approval | Deployment, config changes |
| **T2** | High | Multi-party approval + MFA | Financial transactions, data deletion |
| **T3** | Critical | Board-level approval | Major infrastructure changes |

### 🛠️ **Policy-as-Code Engine**
Visual policy builder with 11 operators (==, !=, >, <, contains, etc.) for creating governance rules without code deployment:

```javascript
IF action == "wire_transfer" 
AND payload.amount > $50000
THEN require_approval tier=T2
     AND notify channels=[compliance, cfo]
     AND require_mfa=true
```

### 📡 **Real-Time SSE Event Streaming**
Server-sent events for live monitoring of all agent activities, policy matches, and approval workflows

### 🏢 **Multi-Tenant Architecture**
Row-level security with tenant isolation, supporting multiple organizations on a single Vienna OS instance

### 🔧 **TypeScript + Python SDKs**
Native language bindings for seamless integration:

```typescript
// TypeScript
import { ViennaClient } from '@vienna-os/client';
const vienna = new ViennaClient({ endpoint: 'https://vienna.company.com' });
await vienna.submitIntent('deploy_service', { service: 'api', version: '1.2.3' });
```

```python
# Python
from vienna_os import ViennaClient
vienna = ViennaClient(endpoint='https://vienna.company.com')
await vienna.submit_intent('deploy_service', {'service': 'api', 'version': '1.2.3'})
```

### 🤖 **Framework Integrations**
Pre-built integrations for popular agent frameworks:
- **OpenClaw** — Governance middleware for agent skills
- **LangChain** — Custom tool wrapper with Vienna validation
- **CrewAI** — Crew-level approval workflows  
- **AutoGen** — Multi-agent conversation governance

### 🛡️ **SOC 2 Controls Documentation**
Built-in compliance reporting and audit trail generation for security certifications

### ⚖️ **USPTO Patent Protection**
Core governance algorithms protected under Patent Application #64/018,152

---

## Architecture Overview

```
                             ┌─────────────────────────────────────────┐
                             │              VIENNA OS                  │
                             └─────────────────────────────────────────┘
                                              │
                                              ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │   Agent     │────▶ │   Gateway   │────▶ │   Policy    │────▶ │   Risk      │
    │   Intent    │      │ Validation  │      │   Engine    │      │   Tier      │
    └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
           │                     │                     │                     │
           │                     ▼                     ▼                     ▼
    ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
    │ Audit Trail │◀──── │   Warrant   │◀──── │  Executor   │◀──── │Verification │
    │  Evidence   │      │ Generation  │      │ (Adapters)  │      │ & Attestation│
    └─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
```

**Flow:**
1. **Agent** submits execution intent
2. **Gateway** validates schema and source identity
3. **Policy Engine** evaluates against governance rules
4. **Risk Tier** classification determines approval requirements
5. **Warrant** issued for T1-T3 actions (T0 auto-approved)
6. **Executor** runs action through secure adapters
7. **Verification** generates cryptographic execution proof
8. **Audit Trail** maintains immutable evidence chain

---

## Quick Start

### Installation

```bash
npm install @vienna-os/core
```

### Basic Usage

```javascript
import { Vienna } from '@vienna-os/core';

// Initialize Vienna OS client
const vienna = new Vienna({
  endpoint: 'https://your-vienna-instance.com',
  apiKey: process.env.VIENNA_API_KEY
});

// Submit an agent intent
const result = await vienna.submitIntent({
  action: 'deploy_service',
  payload: { service: 'user-api', version: '2.1.0' },
  source: { id: 'deployment-agent', platform: 'github-actions' }
});

// Check if approved
if (result.approved) {
  console.log('✅ Action approved and executed');
} else {
  console.log('⏳ Awaiting approval:', result.warrant_id);
}
```

---

## Framework Integration Examples

### OpenClaw Integration

```javascript
// skills/deploy/SKILL.md implementation
import { withVienna } from '@vienna-os/openclaw';

export default withVienna({
  riskTier: 'T1',
  approvers: ['devops-team'],
  rollback: 'automatic'
})(async function deployService({ service, version }) {
  // Deployment logic runs only after Vienna approval
  await kubectl.apply(`deployment/${service}:${version}`);
  return { status: 'deployed', endpoint: await getServiceEndpoint(service) };
});
```

### LangChain Integration

```python
from langchain.tools import BaseTool
from vienna_os.langchain import ViennaTool

class DeploymentTool(ViennaTool):
    name = "deploy_service"
    description = "Deploy a service to production"
    risk_tier = "T1"
    
    def _run(self, service: str, version: str) -> str:
        # This only runs after Vienna governance approval
        result = deploy_to_k8s(service, version)
        return f"Deployed {service}:{version} successfully"
```

### CrewAI Integration

```python
from crewai import Agent, Task, Crew
from vienna_os.crewai import ViennaGoverned

# Vienna governance applies to entire crew execution
@ViennaGoverned(risk_tier='T2', require_unanimous=True)
class TradingCrew(Crew):
    def __init__(self):
        self.market_analyst = Agent(role='Market Analyst')
        self.trader = Agent(role='Trader') 
        self.risk_manager = Agent(role='Risk Manager')
        
    def execute_trade(self, symbol, quantity, max_price):
        # Crew collaboration runs only after governance approval
        analysis = self.market_analyst.analyze(symbol)
        decision = self.trader.decide(analysis, quantity, max_price)
        return self.risk_manager.validate_and_execute(decision)
```

---

## Risk Tiers in Detail

| Tier | Auto-Approve | Human Approval | Multi-Party | MFA Required | Examples |
|------|--------------|----------------|-------------|--------------|----------|
| **T0** | ✅ Yes | ❌ No | ❌ No | ❌ No | Health checks, metrics, read-only ops |
| **T1** | ❌ No | ✅ Single operator | ❌ No | ❌ No | Deployments, config updates, restarts |
| **T2** | ❌ No | ❌ No | ✅ 2+ approvers | ✅ Yes | Financial transactions, data deletion |
| **T3** | ❌ No | ❌ No | ✅ Board-level | ✅ Yes | Infrastructure changes, major contracts |

**Approval Escalation:**
- T1: Slack notification → Single click approval
- T2: Multi-channel notification → 2+ approvers → MFA challenge
- T3: Executive notification → Board meeting → Formal resolution

**Automatic Timeouts:**
- T1: 4 hours (escalates to T2)
- T2: 24 hours (escalates to T3)
- T3: 72 hours (auto-deny)

---

## Links

- 📚 **[Documentation](https://docs.vienna-os.com)** — Complete setup and API reference
- 🚀 **[Live Demo](https://demo.vienna-os.com)** — Try Vienna OS with sample agents
- 🖥️ **[Console](https://console.vienna-os.com)** — Manage your Vienna OS instance  
- 💬 **[Discord](https://discord.gg/vienna-os)** — Community support and discussions
- 📝 **[Blog](https://blog.vienna-os.com)** — Architecture deep-dives and case studies

---

## Contributing

We welcome contributions from the community! Vienna OS is open-source and built in public.

### Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/regulator.ai.git`
3. **Install** dependencies: `npm install`
4. **Run tests**: `npm test`
5. **Start development**: `npm run dev`

### Contribution Areas

- 🔧 **Adapters** — Integrations with new external systems (AWS, GCP, GitHub, etc.)
- 🛠️ **SDK Languages** — Go, Rust, Java client libraries  
- 🤖 **Framework Integrations** — Support for more agent frameworks
- 📊 **Policy Templates** — Pre-built governance rules for common scenarios
- 📖 **Documentation** — Guides, tutorials, and API improvements
- 🧪 **Testing** — Expand test coverage and add integration tests

### Code Style

- **TypeScript** for all new backend code
- **React + TypeScript** for frontend components  
- **ESLint + Prettier** for consistent formatting
- **Jest** for unit testing
- **Conventional Commits** for commit messages

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Update documentation as needed
4. Run `npm run lint:fix` and `npm test`
5. Submit PR with clear description
6. Respond to code review feedback
7. Merge after approval + CI passing

All contributors must agree to our [Contributor License Agreement](CLA.md).

---

## License

**Apache License 2.0**

Vienna OS is free and open-source software. You are free to use, modify, and distribute it for any purpose, including commercial applications.

```
Copyright 2024-2026 ai.ventures × Cornell Law

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Built By

<div align="center">

**🤖 ai.ventures** × **⚖️ Cornell Law**

Vienna OS is developed by [ai.ventures](https://ai.ventures) in partnership with Cornell Law School's AI Policy Institute.

*Combining Silicon Valley's execution speed with Ivy League legal rigor.*

</div>

---

<div align="center">

**Govern your agents. Ship with confidence.**

[🌐 vienna-os.com](https://vienna-os.com) • [📧 hello@vienna-os.com](mailto:hello@vienna-os.com) • [🐙 GitHub](https://github.com/risk-ai/regulator.ai)

</div>