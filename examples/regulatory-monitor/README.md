# Vienna OS Example: Regulatory Monitoring Bot

**Automated compliance monitoring with governed AI execution**

---

## What It Does

This agent automatically:
1. Monitors federal regulatory sources (SEC, FINRA, CFPB, Federal Register)
2. Detects new regulations and changes
3. Analyzes business impact
4. Generates compliance alerts
5. Provides full audit trail for regulators

**Key feature:** Every compliance determination has a warrant (authorization + reasoning + evidence chain).

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

**Edit `.env` and add:**

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Run the Agent

```bash
npm start
```

**Expected output:**

```
🏛 Vienna Regulatory Monitor starting...
✓ Connected to Vienna OS state graph
✓ Registered regulatory monitoring action
✓ Monitoring 4 federal sources

[14:30:00] New regulation detected: SEC Rule 15c2-11
[14:30:02] Analyzing business impact...
[14:30:05] ⚠️  Medium impact (T1) - Requires review
[14:30:05] Warrant generated: warrant_abc123
[14:30:05] Alert sent to compliance team

Waiting for next check (polling every 15 minutes)...
```

---

## How It Works

### Architecture

```
Federal Register API
        ↓
Vienna Intent Gateway → Policy Engine → Warrant System → Executor
                                ↓
                         Compliance Alert
                         (Slack, Email, etc.)
```

### Code Walkthrough

**`agent.js` (simplified):**

```javascript
const { StateGraph, IntentGateway } = require('@vienna/lib');

// Initialize Vienna OS
const stateGraph = new StateGraph({ environment: 'prod' });
await stateGraph.initialize();

const intentGateway = new IntentGateway({ stateGraph });

// Define regulatory sources
const sources = [
  { name: 'SEC', url: 'https://www.sec.gov/cgi-bin/browse-edgar', type: 'rss' },
  { name: 'FINRA', url: 'https://www.finra.org/rules-guidance/rulebooks', type: 'html' },
  { name: 'CFPB', url: 'https://www.consumerfinance.gov/rules-policy/', type: 'api' },
  { name: 'Federal Register', url: 'https://www.federalregister.gov/api/v1/documents', type: 'api' }
];

// Poll sources every 15 minutes
setInterval(async () => {
  for (const source of sources) {
    const changes = await fetchChanges(source);
    
    if (changes.length > 0) {
      // Submit governed intent for each change
      for (const change of changes) {
        const intent = {
          action: 'analyze_regulatory_change',
          description: `New regulation: ${change.title}`,
          parameters: {
            source: source.name,
            change_id: change.id,
            change_type: change.type,
            effective_date: change.effective_date,
            full_text: change.full_text
          },
          source: 'regulatory-monitor',
          metadata: {
            detected_at: new Date().toISOString(),
            source_url: change.url
          }
        };
        
        // Vienna OS handles:
        // 1. Impact analysis (AI reasoning)
        // 2. Risk classification (T0/T1/T2)
        // 3. Warrant generation (authorization + evidence)
        // 4. Approval workflow (if T1/T2)
        // 5. Alert dispatch
        // 6. Audit trail logging
        const result = await intentGateway.submitIntent(intent);
        
        console.log(`[${new Date().toISOString()}] ${change.title}`);
        console.log(`  Impact: ${result.impact_level}`);
        console.log(`  Warrant: ${result.warrant_id}`);
        console.log(`  Status: ${result.status}`);
      }
    }
  }
}, 15 * 60 * 1000); // 15 minutes
```

### Warrant Example

**When a new SEC rule is detected:**

```json
{
  "warrant_id": "warrant_abc123",
  "intent_id": "intent_def456",
  "action": "analyze_regulatory_change",
  "approved": true,
  "risk_tier": "T1",
  "reasoning": "Medium business impact detected. Rule affects broker-dealer registration requirements. Estimated compliance cost: $50K-100K. Effective date: 2026-06-01 (90 days). Action: Review internal procedures, update training materials, notify affected departments.",
  "evidence_chain": [
    {
      "source": "SEC Rule 15c2-11",
      "source_url": "https://www.sec.gov/...",
      "relevant_sections": ["Section 3(a)", "Section 5(b)"],
      "interpretation": "Broker-dealers must establish written supervisory procedures...",
      "confidence": 0.87
    }
  ],
  "preconditions": [
    "change_detected",
    "impact_analyzed",
    "compliance_team_available"
  ],
  "execution_plan": {
    "steps": [
      "Send alert to compliance@company.com",
      "Create Jira ticket (COMP-2345)",
      "Schedule review meeting (2026-04-15)"
    ]
  },
  "rollback_plan": {
    "type": "notification_recall",
    "instructions": "If false positive, send correction email and close ticket"
  },
  "approved_by": "vienna-regulatory-monitor",
  "approved_at": "2026-03-26T14:30:05Z",
  "expires_at": "2026-03-27T14:30:05Z"
}
```

### Audit Trail

**Every action logged:**

```json
{
  "execution_id": "exec_ghi789",
  "tenant_id": "company_xyz",
  "action": "analyze_regulatory_change",
  "status": "success",
  "ledger_events": [
    {
      "event_type": "intent_received",
      "timestamp": "2026-03-26T14:30:00.100Z",
      "data": { "source": "regulatory-monitor" }
    },
    {
      "event_type": "impact_analyzed",
      "timestamp": "2026-03-26T14:30:03.250Z",
      "data": { "impact_level": "medium", "confidence": 0.87 }
    },
    {
      "event_type": "warrant_generated",
      "timestamp": "2026-03-26T14:30:04.100Z",
      "data": { "warrant_id": "warrant_abc123", "risk_tier": "T1" }
    },
    {
      "event_type": "alert_sent",
      "timestamp": "2026-03-26T14:30:05.000Z",
      "data": { "recipients": ["compliance@company.com"], "channel": "email" }
    },
    {
      "event_type": "execution_completed",
      "timestamp": "2026-03-26T14:30:05.500Z",
      "data": { "duration_ms": 5400, "cost": 0.023 }
    }
  ]
}
```

---

## Configuration

### Monitored Sources

**Edit `config/sources.json`:**

```json
{
  "sources": [
    {
      "name": "SEC",
      "url": "https://www.sec.gov/cgi-bin/browse-edgar",
      "type": "rss",
      "enabled": true,
      "check_interval_minutes": 15
    },
    {
      "name": "State Legislature (CA)",
      "url": "https://leginfo.legislature.ca.gov/",
      "type": "html",
      "enabled": false,
      "check_interval_minutes": 60
    }
  ]
}
```

### Risk Classification

**Edit `config/risk-rules.json`:**

```json
{
  "rules": [
    {
      "condition": "impact_cost > 100000",
      "risk_tier": "T2",
      "reasoning": "High financial impact requires executive approval"
    },
    {
      "condition": "effective_date < 30_days",
      "risk_tier": "T1",
      "reasoning": "Urgent compliance deadline"
    },
    {
      "condition": "impact_cost < 10000 AND effective_date > 90_days",
      "risk_tier": "T0",
      "reasoning": "Low impact with sufficient lead time, auto-approve"
    }
  ]
}
```

### Alert Channels

**Edit `config/alerts.json`:**

```json
{
  "channels": {
    "email": {
      "enabled": true,
      "recipients": ["compliance@company.com", "legal@company.com"]
    },
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/...",
      "channel": "#compliance-alerts"
    },
    "jira": {
      "enabled": true,
      "project": "COMP",
      "issue_type": "Regulatory Change"
    }
  }
}
```

---

## Production Deployment

### 1. Set Environment Variables

```bash
export ANTHROPIC_API_KEY=sk-ant-prod-key
export DATABASE_URL=postgresql://...
export SLACK_WEBHOOK_URL=https://hooks.slack.com/...
export JIRA_API_TOKEN=...
```

### 2. Deploy to Vercel

```bash
vercel --prod
```

### 3. Verify Health

```bash
curl https://regulatory-monitor.vercel.app/api/health
```

**Expected:**

```json
{
  "status": "healthy",
  "sources_monitored": 4,
  "last_check": "2026-03-26T14:45:00Z",
  "warrants_today": 12,
  "uptime_hours": 720
}
```

---

## Cost Estimate

**Typical usage (medium-sized company):**

- **API calls:** 4 sources × 96 checks/day = 384 API calls/day
- **AI reasoning:** ~10 new regulations/day × $0.02/analysis = $0.20/day
- **Total:** ~$6-10/month (infrastructure + AI)

**Compare to manual monitoring:**
- Compliance analyst salary: $80K/year = $220/day
- Vienna OS: $0.33/day (1,500× cheaper)

---

## Regulatory Compliance

**This agent helps with:**

- **SEC compliance** (broker-dealer, investment advisor rules)
- **FINRA compliance** (self-regulatory organization rules)
- **CFPB compliance** (consumer financial protection)
- **State-level compliance** (insurance, banking, securities)

**Audit trail meets:**

- **SOC 2 Type II** (immutable logs, access controls)
- **ISO 27001** (information security management)
- **Broker-dealer recordkeeping** (SEC Rule 17a-4)

---

## Next Steps

### Customize for Your Industry

1. Add industry-specific sources (e.g., FDA for healthcare, FAA for aviation)
2. Configure risk rules for your compliance program
3. Integrate with your tools (Jira, Slack, email, SIEM)

### Scale Up

1. Add state-level monitoring (50 states × multiple agencies)
2. Add international regulations (EU, UK, APAC)
3. Multi-tenant deployment (monitor for multiple companies)

### Advanced Features

1. Natural language queries ("Show me all GDPR-related changes this month")
2. Automated compliance impact reports (PDF, Excel)
3. Predictive alerts (detect regulatory trends before rules finalized)

---

## Support

**Questions?**
- GitHub Issues: https://github.com/vienna-os/examples/issues
- Discord: https://discord.gg/vienna-os
- Email: support@vienna-os.com

**Contributing:**
- Pull requests welcome!
- See `CONTRIBUTING.md` for guidelines

---

**License:** MIT  
**Last Updated:** 2026-03-26
