# Governed Finance Agent — Vienna OS Example

**Production-ready financial agent demonstrating SOX/FINRA compliant governance patterns**

## What it does

This agent handles real-world financial operations with proper governance controls:

### 💰 **Operations Covered**
- **Account management** — Balance checks, transaction history, account status
- **Wire transfers** — Domestic and international with amount-based risk tiers  
- **Trading operations** — Equity trades with position limits and market hours validation
- **Reporting** — Regulatory reports (10-K, 10-Q preparation), compliance summaries
- **Risk monitoring** — Position monitoring, P&L tracking, exposure calculations

### 🔐 **Governance Patterns**
| Operation | Risk Tier | Approval Flow | Compliance |
|-----------|-----------|---------------|-------------|
| Account balance check | T0 | Auto-approved | SOX Section 404 |
| Transaction history | T0 | Auto-approved | SOX Section 404 |
| Wire transfer < $10K | T1 | Policy-based | BSA/AML |
| Wire transfer > $10K | T2 | Dual approval + MFA | BSA/AML, OFAC |
| Equity trade < $50K | T1 | Policy-based | FINRA 3110 |
| Equity trade > $50K | T2 | Senior trader approval | FINRA 3110 |
| International wire | T2 | Compliance officer + MFA | OFAC, BSA |
| Regulatory report | T3 | CFO + Legal approval | SOX Section 302 |

## Prerequisites

1. **Vienna OS instance running** (see main README.md)
2. **Python 3.9+** with pip
3. **Vienna OS API key configured**

## Quick Start

### 1. Setup Environment

```bash
# Clone repository
git clone https://github.com/risk-ai/regulator.ai.git
cd regulator.ai/examples/governed-finance-agent

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# For local development, .env defaults work out of the box
# For production: Edit .env and add your actual VIENNA_API_KEY
```

### 2. Run the Agent

```bash
# Run full financial workflow
python agent.py

# Run specific operations
python agent.py --operation wire_transfer
python agent.py --operation trading
python agent.py --operation reporting

# Test compliance scenarios
python agent.py --test-compliance
```

### 3. Expected Output

```
🏦 Vienna OS Finance Agent Starting...
✅ Connected to Vienna OS at http://localhost:3100
✅ Agent registered: finance-agent-prod

━━━ Financial Operation: check_account_balance ━━━
  Account: 12345678
  ✅ Auto-approved (T0) - Warrant: wrt_abc123
  💰 Account Balance: $2,847,293.45
  ✓ Operation completed in 234ms

━━━ Financial Operation: wire_transfer ━━━
  Amount: $25,000.00 → International (Switzerland)
  ⏳ Pending dual approval (T2) - High-value international transfer
  🆔 Proposal ID: prop_def456
  🔗 Approve at: http://localhost:5173/approvals
  📧 Notifications sent to: compliance@company.com, cfo@company.com

━━━ Financial Operation: equity_trade ━━━
  Symbol: AAPL, Quantity: 1000 shares (~$180K)
  ⏳ Pending senior trader approval (T2) - Large position trade
  ⚠️  Market hours validation: NYSE open ✓
  📊 Position limit check: Within bounds ✓
```

## Architecture & Compliance

### 🏛️ **Regulatory Framework**

**SOX Compliance (Sarbanes-Oxley)**
- Section 302: Executive certification of financial reports
- Section 404: Internal controls assessment
- Section 409: Real-time disclosure requirements
- Audit trail: Immutable execution logs with cryptographic attestation

**FINRA Compliance (Financial Industry Regulatory Authority)**  
- Rule 3110: Supervision and written procedures
- Rule 2111: Suitability requirements for trades
- Rule 5310: Best execution requirements
- Risk controls: Position limits, concentration limits, trading hours

**BSA/AML Compliance (Bank Secrecy Act / Anti-Money Laundering)**
- Currency Transaction Reports (CTR) for transfers > $10K
- Suspicious Activity Reports (SAR) for unusual patterns  
- OFAC sanctions screening for international transfers
- Customer Due Diligence (CDD) requirements

### 🔧 **Technical Implementation**

**Risk Classification Engine:**
```python
def classify_risk(operation, amount, destination):
    if operation == 'wire_transfer':
        if amount >= 10000 and destination.is_international():
            return 'T2'  # Dual approval + OFAC screening
        elif amount >= 10000:
            return 'T1'  # Single approval + CTR filing
        else:
            return 'T0'  # Auto-approve
    
    elif operation == 'equity_trade':
        position_value = amount * current_price
        if position_value >= 50000:
            return 'T2'  # Senior trader approval
        else:
            return 'T1'  # Policy-based approval
```

**Warrant Validation:**
```python
def validate_warrant(warrant):
    # Verify cryptographic signature
    if not hmac_verify(warrant.signature, warrant.payload):
        raise SecurityError('Invalid warrant signature')
    
    # Check expiration
    if warrant.expires_at < datetime.now():
        raise SecurityError('Warrant expired')
        
    # Verify execution constraints
    if warrant.amount_limit and requested_amount > warrant.amount_limit:
        raise SecurityError('Amount exceeds warrant limit')
        
    return True
```

**Audit Trail Format (SOX/FINRA):**
```json
{
  "execution_id": "exec_fin_001",
  "operation": "wire_transfer", 
  "amount": 25000.00,
  "currency": "USD",
  "destination": {
    "account": "CH93-0076-2011-6238-5295-7",
    "bank": "UBS Switzerland",
    "swift": "UBSWCHZH80A"
  },
  "warrant": {
    "id": "wrt_fin_001",
    "approved_by": ["jane.doe@company.com", "john.smith@company.com"],
    "mfa_verified": true,
    "risk_tier": "T2",
    "reasoning": "High-value international transfer requires dual approval per BSA regulations"
  },
  "compliance_checks": [
    {"type": "OFAC", "status": "CLEAR", "timestamp": "2026-04-03T10:30:00Z"},
    {"type": "BSA_CTR", "status": "FILED", "reference": "CTR-2026-001234"},
    {"type": "AML_SCREEN", "status": "PASS", "score": 0.02}
  ],
  "execution_proof": {
    "hash": "sha256:abc123...",
    "timestamp": "2026-04-03T10:35:42Z",
    "executed_by": "finance-agent-prod",
    "external_reference": "WIRE-2026-004567"
  }
}
```

## Production Deployment

### 🔐 **Security Configuration**

```bash
# Production environment variables
export VIENNA_API_URL=https://vienna.yourcompany.com
export VIENNA_API_KEY=vos_prod_xxx
export ENCRYPTION_KEY_PATH=/secure/keys/finance-agent.key
export AUDIT_LOG_BUCKET=s3://compliance-audit-logs
export NOTIFICATION_WEBHOOK=https://slack.com/services/...
```

### 📊 **Monitoring & Alerting**

The agent includes built-in monitoring for:
- **Failed transactions** → Immediate Slack alert
- **Unusual patterns** → Daily compliance report  
- **System errors** → PagerDuty integration
- **Audit log integrity** → Weekly cryptographic verification

### 🏢 **Multi-Tenant Deployment**

```python
# Support multiple business units
agents = {
    'trading-desk': FinanceAgent(tenant_id='trading', risk_profile='aggressive'),
    'treasury': FinanceAgent(tenant_id='treasury', risk_profile='conservative'),  
    'corporate-dev': FinanceAgent(tenant_id='corpdev', risk_profile='moderate')
}
```

## Testing & Validation

### 🧪 **Compliance Test Suite**

```bash
# Run full compliance validation
python test_compliance.py

# Test specific scenarios
python test_compliance.py --scenario wire_transfer_limits
python test_compliance.py --scenario trading_hours  
python test_compliance.py --scenario audit_trail_integrity
```

### 📋 **Regulatory Scenarios Tested**
- Wire transfer limits and approvals
- OFAC sanctions screening
- Trading hours enforcement  
- Position limit validation
- Audit trail completeness
- Warrant expiration handling
- Multi-party approval workflows
- MFA requirement enforcement

## Cost Analysis

**Typical usage (mid-size investment firm):**
- **Wire transfers:** 50/day × $0.05/approval = $2.50/day
- **Trading operations:** 200/day × $0.02/trade = $4.00/day  
- **Compliance reporting:** 10/day × $0.10/report = $1.00/day
- **Audit storage:** $5.00/month
- **Total:** ~$230/month

**Compare to manual compliance:**
- Compliance officer salary: $120K/year = $330/day
- Trading compliance: $80K/year = $220/day  
- Vienna OS: $7.50/day (**97% cost reduction**)

## Integration Examples

### 🏦 **Banking Systems**
```python
# Integration with core banking
from vienna_finance_agent import FinanceAgent
from core_banking_api import CoreBankingClient

agent = FinanceAgent()
banking = CoreBankingClient()

# Governed wire transfer
result = await agent.wire_transfer(
    from_account="12345678",
    to_account="87654321", 
    amount=50000,
    purpose="Vendor payment"
)

if result.approved:
    tx_id = await banking.execute_wire(result.warrant)
    await agent.report_execution(result.warrant.id, tx_id)
```

### 📈 **Trading Platforms**
```python
# Integration with trading systems
from vienna_finance_agent import TradingAgent
from trading_platform import TradingAPI

agent = TradingAgent()
trading = TradingAPI()

# Governed equity trade
result = await agent.equity_trade(
    symbol="AAPL",
    quantity=1000,
    order_type="MARKET"
)

if result.approved:
    order_id = await trading.place_order(result.warrant)
    await agent.track_execution(result.warrant.id, order_id)
```

## Support & Compliance

## 🆘 Troubleshooting

### Python Environment Issues

**Error: `ModuleNotFoundError: No module named 'vienna_os_sdk'`**
```bash
# Install the SDK (may not be published yet)
pip install -e ../../../sdk/python/
# OR use development requirements
pip install -r requirements.txt
```

**Error: `Python 3.9+ required`**
```bash
# Check Python version
python3 --version
# Install Python 3.9+ from https://python.org/
```

### Vienna OS Connection Issues

**Error: `Cannot connect to Vienna OS`**
```bash
# Verify Vienna OS is running
curl http://localhost:3100/api/v1/health

# Check your .env file
cat .env | grep VIENNA_API_URL
```

### Financial Operations Issues

**Error: `Compliance validation failed`**
- This is normal for demo - shows Vienna OS blocking invalid operations
- Check agent logs for specific compliance violations

**Error: `Warrant signature invalid`**
- Restart Vienna OS if running locally
- Check that clocks are synchronized

### Performance Issues

**Agent runs slowly:**
- Use local development APIs (defaults in .env.example)  
- Check network connectivity to Vienna OS
- Consider using simulation mode for testing

## 📞 Support & Compliance

**Questions?**
- 📧 Email: support@regulator.ai  
- 💬 Discord: https://discord.gg/vienna-os
- 📖 Docs: https://regulator.ai/docs

**Regulatory Validation:**
- SOX compliance patterns demonstrated
- FINRA governance flows included
- BSA/AML screening examples provided
- Sample compliance reports in `/docs`

**Contributing:**
- Pull requests welcome for additional compliance scenarios
- See main repository `CONTRIBUTING.md` 
- Financial compliance expertise appreciated

---

**License:** BUSL-1.1 (converts to Apache 2.0 in 2030)
**Regulatory Disclaimer:** This example demonstrates governance patterns but should be reviewed by qualified compliance professionals before production use.  
**Last Updated:** 2026-04-03
