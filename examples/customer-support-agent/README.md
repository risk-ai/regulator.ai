# Customer Support Agent — Vienna OS Example

**Use Case:** AI-powered customer support with automated T0/T1 actions and human-in-the-loop for T2/T3.

---

## 🎯 **What This Example Shows**

- **T0 Actions** (Auto-approved): Answer FAQs, check order status
- **T1 Actions** (Auto-approved): Refunds <$50, reset passwords
- **T2 Actions** (Requires approval): Refunds $50-500, account changes
- **T3 Actions** (Requires senior approval): Refunds >$500, account deletion

---

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your VIENNA_API_KEY and OPENAI_API_KEY

# Run the agent
node agent.js
```

---

## 📋 **Features**

### **Tier 0: Information Requests (Auto-approved)**
- "What's the status of order #12345?"
- "What are your return policy terms?"
- "What hours is support available?"

### **Tier 1: Low-Risk Actions (Auto-approved)**
- Refunds <$50
- Password resets
- Email address updates

### **Tier 2: Medium-Risk Actions (Human approval)**
- Refunds $50-$500
- Shipping address changes
- Subscription downgrades

### **Tier 3: High-Risk Actions (Senior approval)**
- Refunds >$500
- Account deletions
- Legal/compliance requests

---

## 🔧 **How It Works**

1. **Customer submits query** → Agent classifies intent with OpenAI
2. **Agent submits intent to Vienna** → Policy evaluates risk tier
3. **T0/T1: Auto-executed** → Customer gets instant response
4. **T2/T3: Approval requested** → Human reviews and approves/denies
5. **Vienna issues warrant** → Agent executes with proof of authorization

---

## 📊 **Example Interactions**

### **T0: Order Status (Auto-approved)**
```
Customer: "What's the status of my order #12345?"
Agent: "Your order #12345 shipped on March 15. Tracking: USPS 9400..."
Vienna: ✅ Approved (T0 - Information request)
```

### **T1: Small Refund (Auto-approved)**
```
Customer: "I'd like a refund for this $35 item"
Agent: "Refund of $35 processed to your original payment method."
Vienna: ✅ Approved (T1 - Refund <$50)
```

### **T2: Large Refund (Requires Approval)**
```
Customer: "I need a $250 refund for this order"
Agent: "Your refund request has been submitted for review. You'll hear back within 2 hours."
Vienna: ⏳ Pending approval (T2 - Refund $50-500)
Human: Approves
Vienna: ✅ Approved with warrant
Agent: "Your $250 refund has been approved and processed."
```

### **T3: Account Deletion (Requires Senior Approval)**
```
Customer: "Please delete my account"
Agent: "Your account deletion request has been submitted for review."
Vienna: ⏳ Pending senior approval (T3 - Permanent action)
Senior: Reviews compliance requirements, approves
Vienna: ✅ Approved with warrant
Agent: "Your account has been deleted. All data will be removed within 30 days."
```

---

## 🛡️ **Governance Benefits**

### **Before Vienna OS:**
- ❌ Agent could refund any amount without oversight
- ❌ Account deletions happened instantly without review
- ❌ No audit trail for compliance
- ❌ Risk of agent going rogue or being manipulated

### **After Vienna OS:**
- ✅ Tiered approval workflow (T0→T1→T2→T3)
- ✅ Human oversight for high-risk actions
- ✅ Complete audit trail for every decision
- ✅ Execution warrants prove authorization
- ✅ Policy changes don't require code changes

---

## 📝 **Policy Configuration**

The agent uses a risk-based policy in Vienna OS:

```yaml
# T0: Information requests (auto-approve)
- action: check_order_status
  risk_tier: T0
  approval: automatic

# T1: Low-risk actions (auto-approve)
- action: process_refund
  conditions:
    - amount < 50
  risk_tier: T1
  approval: automatic

# T2: Medium-risk actions (human approval)
- action: process_refund
  conditions:
    - amount >= 50
    - amount < 500
  risk_tier: T2
  approval: required
  approvers: [support_manager]

# T3: High-risk actions (senior approval)
- action: delete_account
  risk_tier: T3
  approval: required
  approvers: [compliance_team, senior_manager]
```

---

## 🔌 **Integration**

This example can integrate with:
- **OpenAI** for intent classification
- **Stripe** for payment processing
- **Slack** for approval notifications
- **Zendesk/Intercom** for ticketing

---

## 📊 **Metrics**

Track in Vienna OS Console:
- **T0 actions**: 1000+ auto-approved/day (FAQ, order status)
- **T1 actions**: 50+ auto-approved/day (small refunds, password resets)
- **T2 actions**: 10+ human-approved/day (large refunds, account changes)
- **T3 actions**: 1-2 senior-approved/week (account deletions)

**Result:** 95% of requests auto-handled, 5% need human review.

---

## 🎓 **Learn More**

- [Vienna OS Docs](https://regulator.ai/docs)
- [Governance Policies](https://regulator.ai/docs/policies)
- [Approval Workflows](https://regulator.ai/docs/approvals)

---

**Built with ❤️ using Vienna OS**
