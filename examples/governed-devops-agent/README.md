# Governed DevOps Agent — Vienna OS Example

**A production-ready DevOps agent demonstrating Vienna OS governance patterns**

This example shows how to build enterprise-grade DevOps automation with proper governance controls. Every operation goes through Vienna OS for validation, approval, and audit.

## ✨ What It Demonstrates

Real-world DevOps operations with appropriate risk controls:

| Operation | Risk Tier | Approval Flow | Example |
|-----------|-----------|---------------|---------|
| Health checks | T0 | Auto-approved | Service status, disk usage, memory |
| Config updates | T1 | Policy-based | Environment variables, feature flags |
| Service restarts | T1 | Policy-based | Rolling restart, graceful shutdown |
| Production deploys | T2 | Human approval | New releases, database migrations |
| Data operations | T2+ | Multi-party | Backups, data deletion, schema changes |

**Key Features:**
- ✅ Comprehensive error handling and retry logic
- ✅ Proper audit trails for compliance (SOX, ITIL)
- ✅ Risk-appropriate approval workflows
- ✅ Production-ready patterns and best practices
- ✅ Integration with common DevOps tools

## 📋 Prerequisites

1. **Vienna OS running locally** (see [main README](../../README.md) for setup)
2. **Node.js 20+** ([download](https://nodejs.org/))
3. **API access configured**

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/examples/governed-devops-agent

# Install dependencies 
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
echo "VIENNA_API_URL=http://localhost:3100" > .env
echo "VIENNA_API_KEY=dev_key_no_auth_needed" >> .env

# Optional: Add your actual API key for production
# echo "VIENNA_API_KEY=vos_your_production_key" >> .env
```

### 3. Run the Agent

```bash
# Run with default workflow
npm start

# Run specific scenarios
npm run demo:health-check
npm run demo:deployment
npm run demo:emergency
```

## 📊 What You'll See

```bash
🤖 Governed DevOps Agent starting...
✅ Vienna OS connection verified
✅ Agent registered successfully

━━━ DevOps Operation: check_service_health ━━━
  Payload: {"services": ["api", "database", "cache"]}
  📊 Risk Assessment: T0 (auto-approved)
  ✅ Executed successfully (234ms)
  🎫 Warrant: wrt_abc123... | TTL: 5m | Audit: logged

━━━ DevOps Operation: deploy_service ━━━
  Payload: {"service": "user-api", "version": "v2.1.0", "environment": "production"}
  📊 Risk Assessment: T2 (human approval required)
  ⏳ Pending approval: prop_def456...
  🔗 Approve at: http://localhost:5173/approvals
  📧 Notifications sent to: devops-team@company.com

━━━ DevOps Operation: rollback_deployment ━━━
  Payload: {"service": "user-api", "to_version": "v2.0.8", "reason": "Critical bug"}
  📊 Risk Assessment: T1 (policy-approved due to emergency)
  ✅ Executed successfully (1.2s)
  🎫 Warrant: wrt_ghi789... | Emergency rollback authorized
```

## 🔑 Key Governance Concepts

- **Every action flows through Vienna OS** — including read operations
- **Risk-based approval workflows** — T0 auto-approves, T2 requires human oversight  
- **Cryptographic warrants** — time-limited, scoped execution permissions
- **Complete audit trails** — SOX/ITIL compliant logging for every operation
- **Fail-safe design** — agent pauses for approval rather than proceeding unsafely

## 💡 Production Patterns

This example demonstrates enterprise-ready patterns:

### Error Handling
```javascript
// Automatic retry with exponential backoff
await this.submitIntent('deploy', payload, { retries: 3 });

// Graceful degradation on Vienna OS unavailability  
if (viennaUnavailable) {
  await this.emergencyMode('critical_fix', payload);
}
```

### Audit Integration
```javascript
// Every action generates compliance-ready audit trail
const result = await vienna.submitIntent(intent);
await auditLogger.logCompliance(result, 'SOX_404');
```

### Risk Detection
```javascript
// Context-aware risk classification
const riskTier = this.detectRisk(action, environment, timeOfDay);
intent.risk_tier = riskTier; // Override automatic detection
```
